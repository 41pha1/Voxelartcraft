import { createStructureNBT } from "./schematic.js";

const DEFAULT_TARGET = './res/test.svg';
const textureAtlas = './atlas.png';

const voxelShaderFile = "./shaders/voxel.glsl";
const processingShaderFile = "./shaders/processing.glsl";
const discretizeShaderFile = "./shaders/discretize.glsl";
const vertexShaderFile = "./shaders/vertex.glsl";

const canvas = document.querySelector("#glcanvas");
const gl = canvas.getContext("webgl2");

const outputCanvas = document.querySelector('#canvas');
const outputCtx = outputCanvas.getContext('2d');

const discretizeShader = createShaderProgram(vertexShaderFile, discretizeShaderFile);
const voxelShader = createShaderProgram(vertexShaderFile, voxelShaderFile);
const processingShader = createShaderProgram(vertexShaderFile, processingShaderFile);

// Target Image
var texture = null;
var targetImage = null;
var pixelData = null;
var processedImage = null;
var framebuffer = null;
var output = null;
var voxel_preview = null;

// Palette
var palette = null;

// Processing
var brightness = 1.0;
var contrast = 1.0;
var saturation = 1.0;
var highlights = 0.0;
var shadows = 0.0;
var temperature = 0.0;
var tint = 0.0;
var discretize = false;
var processingFrameBuffer = null;
var discreteVoxelizedFrameBuffer = null;
var processingTexture = null;
var voxelizedTexture = null;

// Uniforms
var depth_uniform = null;

// Settings
const camPos = [0.7, 1.62, 0.7];
var fov = 60.;
var pitch = Math.asin(1 / Math.sqrt(3)) * 180 / Math.PI;
var yaw = 45.;

// QUALITY SETTINGS
var minDepth = 10;
var maxDepth = 300;
var startVariance = 5;
var endVariance = 450;
var minVisibility = 0.1;
var pixelArtMode = 0.0;
const depthStep = 1.;

// States
var voxelizing = false;
var requestStop = false;
var voxelized = false;

// Voxelization
var blocks = null;
var materials = null;

function loadShader(shaderFile) {
    var shaderSource;
    var request = new XMLHttpRequest();
    request.open('GET', shaderFile, false);
    request.send(null);
    shaderSource = request.responseText;
    return shaderSource;
}

const clientWaitAsync = function (gl, sync, flags = 0, interval_ms = 10) {
    return new Promise(function (resolve, reject) {
        var check = function () {
            var res = gl.clientWaitSync(sync, flags, 0);
            if (res == gl.WAIT_FAILED) {
                reject();
                return;
            }
            if (res == gl.TIMEOUT_EXPIRED) {
                setTimeout(check, interval_ms);
                return;
            }
            resolve();
        };
        check();
    });
};

const readPixelsAsync = function (type, width, height, buffer) {
    const bufpak = gl.createBuffer();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, bufpak);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, buffer.byteLength, gl.STREAM_READ);
    gl.readPixels(0, 0, width, height, gl.RGBA, type, 0);
    var sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) return null;
    gl.flush();
    return clientWaitAsync(gl, sync, 0, 10).then(function () {
        gl.deleteSync(sync);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, bufpak);
        gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, buffer);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        gl.deleteBuffer(bufpak);

        return buffer;
    });
};

function createTexture(w, h, type = gl.FLOAT, data = null) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    const level = 0;
    const width = w;
    const height = h;
    const border = 0;
    const format = gl.RGBA;
    var internalFormat = null;

    if (type == gl.FLOAT) {
        data = data || new Float32Array(w * h * 4);
        internalFormat = gl.RGBA16F;
    } else if (type == gl.UNSIGNED_BYTE) {
        data = data || new Uint8Array(w * h * 4);
        internalFormat = gl.RGBA8;

    } else
        throw "Invalid framebuffer type";

    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border,
        format, type, data);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    return tex;
}

async function loadTexture(image_obj, activeTexture = gl.TEXTURE0, interp = gl.NEAREST) {
    texture = gl.createTexture();
    gl.activeTexture(activeTexture);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;

    const pixel = new Uint8Array([0, 0, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, 1, 1, 0, srcFormat, srcType, pixel);

    await image_obj.decode();

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image_obj);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, interp);

    return image_obj;
}

function createShader(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    return shader;
}

function createShaderProgram(vertexShaderFile, voxelShaderFile) {
    var voxelShader = gl.createProgram();

    var vertexShader = createShader(gl.VERTEX_SHADER, loadShader(vertexShaderFile));
    var fragmentShader = createShader(gl.FRAGMENT_SHADER, loadShader(voxelShaderFile));

    gl.attachShader(voxelShader, vertexShader);
    gl.attachShader(voxelShader, fragmentShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error('ERROR compiling vertex shader!', gl.getShaderInfoLog(vertexShader));
        return;
    }

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error('ERROR compiling fragment shader!', gl.getShaderInfoLog(fragmentShader));
        return;
    }

    gl.linkProgram(voxelShader);
    gl.useProgram(voxelShader);

    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    var vertices = [-1.0, 1.0, 0.0,
    -1.0, -1.0, 0.0,
        1.0, 1.0, 0.0,
        1.0, -1.0, 0.0];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    var positionAttribLocation = gl.getAttribLocation(voxelShader, "position");
    gl.vertexAttribPointer(
        positionAttribLocation, // Attribute location
        3, // Number of elements per attribute
        gl.FLOAT, // Type of elements
        gl.FALSE,
        3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
        0 // Offset from the beginning of a single vertex to this attribute
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(positionAttribLocation);

    return voxelShader;
}

function setUniforms(w, h, depthStep, camPos, pitch, yaw, fov, maxDepth) {

    var maxDepthUniformLocation = gl.getUniformLocation(voxelShader, "u_maxDepth");
    gl.uniform1f(maxDepthUniformLocation, maxDepth);

    var doPixelArtUniformLocation = gl.getUniformLocation(voxelShader, "u_pixelArtMode");
    gl.uniform1f(doPixelArtUniformLocation, pixelArtMode);

    var resolutionUniformLocation = gl.getUniformLocation(voxelShader, "u_aspect");
    gl.uniform1f(resolutionUniformLocation, w / h);

    var resolutionUniformLocation = gl.getUniformLocation(voxelShader, "u_resolution");
    gl.uniform2f(resolutionUniformLocation, w, h);

    var depthStepUniformLocation = gl.getUniformLocation(voxelShader, "u_depthStep");
    gl.uniform1f(depthStepUniformLocation, depthStep);

    var camPosUniformLocation = gl.getUniformLocation(voxelShader, "u_camPos");
    gl.uniform3fv(camPosUniformLocation, camPos);

    var pitchUniformLocation = gl.getUniformLocation(voxelShader, "u_pitch");
    gl.uniform1f(pitchUniformLocation, pitch);

    var yawUniformLocation = gl.getUniformLocation(voxelShader, "u_yaw");
    gl.uniform1f(yawUniformLocation, yaw);

    var fovUniformLocation = gl.getUniformLocation(voxelShader, "u_fov");
    gl.uniform1f(fovUniformLocation, fov);

    var alphaMaskUniformLocation = gl.getUniformLocation(voxelShader, "u_alphaMask");
    gl.uniform1i(alphaMaskUniformLocation, 0);

    var projectionUniformLocation = gl.getUniformLocation(voxelShader, "u_projection");
    var perspective = glm.perspective(glm.radians(fov), w / h, 0.1, 1000.0);
    perspective = new Float32Array(perspective.elements);
    gl.uniformMatrix4fv(projectionUniformLocation, false, perspective);

    var viewUniformLocation = gl.getUniformLocation(voxelShader, "u_view");
    var lookAt = [
        camPos[0] + Math.cos(glm.radians(pitch)) * Math.sin(glm.radians(yaw)),
        camPos[1] + Math.sin(glm.radians(pitch)),
        camPos[2] + Math.cos(glm.radians(pitch)) * Math.cos(glm.radians(yaw))
    ];

    lookAt = glm.vec3(lookAt);
    camPos = glm.vec3(camPos);
    var view = glm.lookAt(camPos, lookAt, glm.vec3(0, 1, 0));
    view = new Float32Array(view.elements);
    gl.uniformMatrix4fv(viewUniformLocation, false, view);

    depth_uniform = gl.getUniformLocation(voxelShader, "u_depth");
}

function render(depth) {
    gl.useProgram(voxelShader);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.uniform1f(depth_uniform, depth);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}


function applyProcessing() {
    setVoxelProgress(0);
    showProcessingCanvas();
    loadSettingsFromUI();

    gl.useProgram(processingShader);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const brightnessUniform = gl.getUniformLocation(processingShader, "u_brightness");
    gl.uniform1f(brightnessUniform, brightness / 100);

    const contrastUniform = gl.getUniformLocation(processingShader, "u_contrast");
    gl.uniform1f(contrastUniform, contrast / 100);

    const saturationUniform = gl.getUniformLocation(processingShader, "u_saturation");
    gl.uniform1f(saturationUniform, saturation / 100);

    const highlightsUniform = gl.getUniformLocation(processingShader, "u_highlights");
    gl.uniform1f(highlightsUniform, highlights / 100);

    const shadowsUniform = gl.getUniformLocation(processingShader, "u_shadows");
    gl.uniform1f(shadowsUniform, shadows / 100);

    const colorTempUniform = gl.getUniformLocation(processingShader, "u_temperature");
    gl.uniform1f(colorTempUniform, temperature / 100);

    const colorTintUniform = gl.getUniformLocation(processingShader, "u_tint");
    gl.uniform1f(colorTintUniform, tint / 100);


    gl.bindFramebuffer(gl.FRAMEBUFFER, processingFrameBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    readPixelsAsync(gl.UNSIGNED_BYTE, canvas.width, canvas.height, processedImage);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    applyPreviewDiscretization();

    if (voxelizing) {
        voxelConvert();
    }

    if(voxelized) {
        voxelizing = false;
        voxelized = false;
        blocks = [];
        updateMaterialList();
    }
}

function meanAndVariance(pixels) {
    var meanColor = [0., 0., 0.];

    for (const pixel of pixels) {
        meanColor[0] += processedImage[pixel];
        meanColor[1] += processedImage[pixel + 1];
        meanColor[2] += processedImage[pixel + 2];
    }
    meanColor[0] /= pixels.length;
    meanColor[1] /= pixels.length;
    meanColor[2] /= pixels.length;

    var variance = [0., 0., 0.];

    for (const pixel of pixels) {
        variance[0] += Math.pow(processedImage[pixel + 0] - meanColor[0], 2);
        variance[1] += Math.pow(processedImage[pixel + 1] - meanColor[1], 2);
        variance[2] += Math.pow(processedImage[pixel + 2] - meanColor[2], 2);
    }
    const maxVariance = Math.max(variance[0], variance[1], variance[2]) / pixels.length;

    return [meanColor, maxVariance];
}

function hashPixels(pixels, occlusionMask) {
    const foundBlocks = new Map();
    const maxBlock = 1000;

    for (var i = 0; i < canvas.width * canvas.height * 4; i += 4) {
        if (occlusionMask[i / 4] == 1 || pixels[i + 3] == 0.)
            continue;

        const key = (pixels[i] + maxBlock) +
            (pixels[i + 1] + maxBlock) * 2 * maxBlock +
            (pixels[i + 2] + maxBlock) * 4 * maxBlock * maxBlock;

        var list = foundBlocks.get(key) || [];
        list.push(i);
        foundBlocks.set(key, list);
    }

    return foundBlocks;
}

function updateMaterialList() {
    materials = [];

    for (const block of blocks) {
        const blockID = selectBlockFromPalette(block);
        
        if(!isNaN(blockID))
            materials.push(blockID);
    }

    const materialList = {};

    for (var i = 0; i < materials.length; i++) {
        const blockIndex = materials[i];
        const blockID = palette[blockIndex][0];
        if (materialList[blockID] == undefined)
            materialList[blockID] = 0;

        materialList[blockID]++;
    }

    const blockList = document.querySelector(".blockList");
    var toSort = blockList.children;

    toSort = Array.prototype.slice.call(toSort, 0);

    toSort.sort(function (a, b) {
        const aID = materialList[a.children[0].id] || 0;
        const bID = materialList[b.children[0].id] || 0;

        return bID != aID ? bID - aID : a.children[0].id.localeCompare(b.children[0].id);
    });

    blockList.innerHTML = "";
    for (var i = 0, l = toSort.length; i < l; i++) {
        if (materialList[toSort[i].children[0].id])
            toSort[i].classList.add("activeMaterial");
        else
            toSort[i].classList.remove("activeMaterial");

        toSort[i].children[2].innerHTML = "x" + (materialList[toSort[i].children[0].id] || 0);
        blockList.appendChild(toSort[i]);
    }
    const totalAmountDiv = document.querySelector(".material-total-count");

    var totalAmount = 0;
    for (const key in materialList) {
        totalAmount += materialList[key];
    }

    document.querySelector("#downloadButton").disabled = totalAmount == 0;

    totalAmountDiv.innerHTML = "Total: " + totalAmount;
    totalAmountDiv.style.display = totalAmount > 0 ? "block" : "none";
}

function applyPreviewDiscretization() {
    gl.useProgram(discretizeShader);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const discretizeUniform = gl.getUniformLocation(discretizeShader, "u_discretize");
    gl.uniform1i(discretizeUniform, discretize);

    const applyTextureUniform = gl.getUniformLocation(discretizeShader, "u_applyTexture");
    gl.uniform1i(applyTextureUniform, 0);

    // Preview discretization
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, processingTexture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Voxelization discretization
    if (!voxelized)
        return;

    gl.uniform1i(applyTextureUniform, 1);
    gl.uniform1i(discretizeUniform, 1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, voxelizedTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, canvas.width, canvas.height, 0, gl.RGBA, gl.FLOAT, output);

    gl.bindFramebuffer(gl.FRAMEBUFFER, discreteVoxelizedFrameBuffer);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const promise = readPixelsAsync(gl.UNSIGNED_BYTE, canvas.width, canvas.height, voxel_preview);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    promise.then(() => {
        var UAC = new Uint8ClampedArray(voxel_preview, canvas.width, canvas.height);
        var imageData = new ImageData(UAC, canvas.width, canvas.height);
        outputCtx.putImageData(imageData, 0, 0);
    });
}

function updatePalette() {
    const blockSelectorDiv = document.querySelector(".blockList");

    palette = [];
    var index = 0;

    for (const blockSelector of blockSelectorDiv.children) {
        if (blockSelector.children[0].checked) {
            const blockID = blockSelector.children[0].id;
            const rgb = blockSelector.children[1].children[0].innerHTML.split(", ");
            const blockIndex = blockSelector.children[1].children[1].innerHTML;
            const gravity = blockSelector.children[0].classList.contains("gravity");
            palette.push([blockID, parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2]), index++, blockIndex, gravity]);
        }
    }

    const paletteTexture = new Float32Array(palette.length * 4);

    for (const block of palette) {
        paletteTexture[block[4] * 4 + 0] = block[1] / 255.0;
        paletteTexture[block[4] * 4 + 1] = block[2] / 255.0;
        paletteTexture[block[4] * 4 + 2] = block[3] / 255.0;
        paletteTexture[block[4] * 4 + 3] = block[5];
    }

    // Create palette texture
    gl.useProgram(discretizeShader);
    gl.activeTexture(gl.TEXTURE0);
    const discretizeTargetImageUniform = gl.getUniformLocation(discretizeShader, "u_targetImage");
    gl.uniform1i(discretizeTargetImageUniform, 0);

    gl.activeTexture(gl.TEXTURE1);
    const texture = createTexture(palette.length, 1, gl.FLOAT, paletteTexture);
    const paletteTextureUniform = gl.getUniformLocation(discretizeShader, "u_palette");
    gl.uniform1i(paletteTextureUniform, 1);
    gl.activeTexture(gl.TEXTURE0);

    const palleteSizeUniform = gl.getUniformLocation(discretizeShader, "u_paletteSize");
    gl.uniform1f(palleteSizeUniform, palette.length);

    applyPreviewDiscretization();
    updateMaterialList();
}

function selectBlockFromPalette(meanColor) {
    var closestBlock = NaN;
    var closestDistance = 10000000

    for (const block of palette) {
        const rdis = Math.pow(block[1] - meanColor[0], 2);
        const gdis = Math.pow(block[2] - meanColor[1], 2);
        const bdis = Math.pow(block[3] - meanColor[2], 2);

        const distance = rdis + gdis + bdis;

        if (distance < closestDistance) {
            closestBlock = block[4];
            closestDistance = distance;
        }
    }

    return closestBlock;
}

function estimatePixelsPerBlock(x, y, z) {
    const dx = x - camPos[0];
    const dy = y - camPos[1];
    const dz = z - camPos[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const beta = glm.radians(fov);
    const k = 0.5 / distance;

    const alpha = k - k * k * k / 3.0; // Taylor series approximation of atan(x)
    const widthPerBlock = ((2 * alpha) / beta) * canvas.width;

    return widthPerBlock * widthPerBlock;
}

function analyzeBlocks(foundBlocks, pixels, occlusionMask, allowedVariance, output, blocks, outputCtx) {
    const cutoff = maxDepth - 2.5;

    for (const key of foundBlocks.keys()) {
        var forcePlace = allowedVariance == Infinity || pixelArtMode == 1.0;
        const blockPixels = foundBlocks.get(key);

        const maxBlock = 1000;
        const x = key % (2 * maxBlock) - maxBlock;
        const y = Math.floor(key / (2 * maxBlock)) % (2 * maxBlock) - maxBlock;
        const z = Math.floor(key / (4 * maxBlock * maxBlock)) % (2 * maxBlock) - maxBlock;

        const dx = x - camPos[0];
        const dy = y - camPos[1];
        const dz = z - camPos[2];
        const distance2 = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Force place blocks on the edge of the render distance
        if (distance2 > cutoff)
            forcePlace = true;

        // Skip some columns so that light can shine through
        if (!forcePlace && (x + z * 5) % 13 == 0) // (x + z * 2) % 5 == 0)
            continue;

        // Skip blocks that are too occluded
        const foundPixels = blockPixels.length;
        const estimatedPixels = estimatePixelsPerBlock(x, y, z);
        if (!forcePlace && foundPixels < estimatedPixels * minVisibility)
            continue;

        // Only place blocks that match the target image 
        var [meanColor, variance] = meanAndVariance(blockPixels);
        if (!forcePlace && variance > allowedVariance)
            continue;

        const r = meanColor[0] / 255.0;
        const g = meanColor[1] / 255.0;
        const b = meanColor[2] / 255.0;

        for (const pixel of blockPixels) {
            const shade = (Math.floor((pixels[pixel + 3] - 1.0) / 256.0) + 6) * 0.1;
            const texelUV = Math.floor((pixels[pixel + 3] - 1.0) % 256);

            occlusionMask[pixel / 4] = 1;
            output[pixel] = r;
            output[pixel + 1] = g;
            output[pixel + 2] = b;
            output[pixel + 3] = pixels[pixel + 3] - 1.0;

            // Draw voxel preview
            outputCtx.fillStyle = "rgb(" + meanColor[0] * shade + ", " + meanColor[1] * shade + ", " + meanColor[2] * shade + ")";
            outputCtx.fillRect(pixel / 4 % canvas.width, Math.floor(pixel / 4 / canvas.width), 1, 1);
        }

        blocks.push([meanColor[0], meanColor[1], meanColor[2], x, y, z]);
    }
}

async function placeBlocks(occlusionMask, output, depth, blocks, outputCtx) {
    render(depth);

    if (pixelArtMode == 1)
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.FLOAT, pixelData);
    else
        readPixelsAsync(gl.FLOAT, canvas.width, canvas.height, pixelData)

    // // write pixel data to canvas
    // const UAC = new Uint8ClampedArray(pixelData, canvas.width, canvas.height);
    // const imageData = new ImageData(UAC, canvas.width, canvas.height);
    // outputCtx.putImageData(imageData, 0, 0);

    const foundBlocks = hashPixels(pixelData, occlusionMask);
    var allowedVariance = (endVariance - startVariance) * Math.pow((depth - minDepth) / (maxDepth - minDepth), 2.0) + startVariance;

    analyzeBlocks(foundBlocks, pixelData, occlusionMask, allowedVariance, output, blocks, outputCtx);
}

function setupFramebuffer(type = gl.FLOAT) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    const tex1 = createTexture(canvas.width, canvas.height, type);

    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex1, 0);

    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    return [fb, tex1];
}

function loadSettingsFromUI() {
    minDepth = parseFloat(document.querySelector('#depth-min-number').value);
    maxDepth = parseFloat(document.querySelector('#depth-max-number').value);
    startVariance = 10.0;
    endVariance = parseFloat(document.querySelector('#variance-number').value);
    fov = parseFloat(document.querySelector('#fov-number').value);
    pitch = -parseFloat(document.querySelector('#pitch-number').value);
    yaw = -parseFloat(document.querySelector('#yaw-number').value);
    brightness = parseFloat(document.querySelector('#brightness-number').value);
    contrast = parseFloat(document.querySelector('#contrast-number').value);
    saturation = parseFloat(document.querySelector('#saturation-number').value);
    discretize = document.querySelector('#discretize-checkbox').checked;
    highlights = parseFloat(document.querySelector('#highlights-number').value);
    shadows = parseFloat(document.querySelector('#shadows-number').value);
    temperature = parseFloat(document.querySelector('#temperature-number').value);
    tint = parseFloat(document.querySelector('#tint-number').value);
    pixelArtMode = document.querySelector('#pixelart-checkbox').checked;
}

function showProcessingCanvas() {
    document.querySelector('.processing-preview').style.display = "block";
    document.querySelector('.voxel-preview').style.display = "none";
}

function showVoxelCanvas() {
    document.querySelector('.processing-preview').style.display = "none";
    document.querySelector('.voxel-preview').style.display = "block";
}

function setVoxelProgress(progress) {
    const display_progess = progress * 100;
    document.querySelector('#conversion-progress').style.width = display_progess + "%";
}

function voxelConvert() {
    if (voxelizing) {
        requestStop = true;
        setTimeout(() => { voxelConvert(); }, 100);
        return;
    }
    requestStop = false;
    voxelized = false;
    voxelizing = true;

    blocks = [];
    setVoxelProgress(0);
    showVoxelCanvas();
    updateMaterialList();
    loadSettingsFromUI();
    gl.useProgram(voxelShader);
    var tex = null;
    [framebuffer, tex] = setupFramebuffer();
    setUniforms(canvas.width, canvas.height, depthStep, camPos, pitch, yaw, fov, maxDepth);

    output = new Float32Array(canvas.width * canvas.height * 4);
    var occlusionMask = new Int8Array(canvas.width * canvas.height * 1);
    pixelData = new Float32Array(canvas.width * canvas.height * 4);
    voxel_preview = new Uint8Array(canvas.width * canvas.height * 4);
    outputCtx.clearRect(0, 0, canvas.width, canvas.height);

    var depth = minDepth;

    if (pixelArtMode == 1) {
        placeBlocks(occlusionMask, output, depth, blocks, outputCtx);
        voxelizing = false;
        voxelized = true;
        updateMaterialList();
        applyPreviewDiscretization();
        console.log("Finished voxelizing: " + blocks.length);
    } else {
        var timer = setInterval(() => {
            placeBlocks(occlusionMask, output, depth, blocks, outputCtx);

            console.log("Depth: " + depth);
            depth += depthStep;
            setVoxelProgress((depth - minDepth) / (maxDepth * 1.75 - minDepth + 2));

            if (depth > maxDepth * 1.75 + 2 || requestStop) {
                voxelizing = false;
                clearInterval(timer);

                if (!requestStop) {
                    voxelized = true;
                    setVoxelProgress(0);
                    updateMaterialList();
                    applyPreviewDiscretization();
                    console.log("Finished voxelizing: " + blocks.length);
                } else {
                    blocks = [];
                }
            }
        }, 0);
    }
}

async function downloadNBT() {
    if (!voxelized) {
        alert("Please wait for the voxelization to finish");
        return;
    }

    const nbtFile = await createStructureNBT(blocks, palette, materials);

    const url = URL.createObjectURL(nbtFile);
    const link = document.createElement('a');

    link.download = 'structure.nbt';
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
}

async function updateTargetImage(image_obj) {
    const img = await loadTexture(image_obj);
    console.log("Loaded image: " + img.width + "x" + img.height);

    canvas.width = img.width;
    canvas.height = img.height;
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;
    processedImage = new Uint8ClampedArray(canvas.width * canvas.height * 4);

    // Get pixels from image
    var temp = document.createElement('canvas');
    var tempCTX = temp.getContext('2d');
    temp.width = img.width;
    temp.height = img.height;
    tempCTX.drawImage(img, 0, 0);

    gl.useProgram(processingShader);
    const targetImageUniform = gl.getUniformLocation(processingShader, "u_targetImage");
    gl.uniform1i(targetImageUniform, 0);
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Setup processing framebuffer
    [processingFrameBuffer, processingTexture] = setupFramebuffer(gl.UNSIGNED_BYTE);
    voxelizedTexture = createTexture(canvas.width, canvas.height, gl.FLOAT);

    var temp = null;
    [discreteVoxelizedFrameBuffer, temp] = setupFramebuffer(gl.UNSIGNED_BYTE);

    blocks = [];

    applyProcessing();
    updateMaterialList();
    updatePalette();
    voxelized = false;
}

function stopVoxelization() {
    requestStop = true;
}

async function main() {
    // Only continue if WebGL is available and working
    if (!gl) {
        alert("need WebGL2");
        return;
    }
    const ext = gl.getExtension("EXT_color_buffer_float");
    if (!ext) {
        alert("need EXT_color_buffer_float");
        return;
    }

    // load texture atlas into descritize shader
    gl.useProgram(discretizeShader);
    const textureAtlasImage = new Image();
    textureAtlasImage.src = textureAtlas;
    await loadTexture(textureAtlasImage, gl.TEXTURE2, gl.NEAREST);
    const textureAtlasUniform = gl.getUniformLocation(discretizeShader, "u_textureAtlas");
    gl.uniform1i(textureAtlasUniform, 2);
    const textureAtlasSizeUniform = gl.getUniformLocation(discretizeShader, "u_textureAtlasSize");
    const width = textureAtlasImage.width;
    const height = textureAtlasImage.height;
    gl.uniform2f(textureAtlasSizeUniform, width, height);
    gl.activeTexture(gl.TEXTURE0);
    gl.useProgram(voxelShader);

    // load default target image
    const img = new Image();
    img.src = DEFAULT_TARGET;
    await updateTargetImage(img);
}

main();

export { voxelConvert, updateTargetImage, updatePalette, applyProcessing, downloadNBT, stopVoxelization };


//TODO:
// FEATURES:
// - Custom variance function

// DESIGN:
// - Add tooltips
// - Example image with instructions
// - Show credits and github link
// - Custom names for property buttons
// - Adjust used block indicator color
// - Adjust the font?

// BUGS:
// - Fix example image bugs and image disappearing when clicking the upload button
// - Fix undeterministic voxelization
// - Unexpected behavior when setting min depth equal to max depth
// - depth input uses manhattan distance instead of euclidean distance

// PUBLICATION:
// - Show case youtube video
// - Reddit post
// - buy domain

// NICE TO HAVE:
// - Add crosshair to preview
// - count placed pixels to terminate early
// - Mobile support
// - Block minecraft version
// - Eastereggs