const DEFAULT_TARGET = './res/ganyu3_t.png';
const voxelShaderFile = "./shaders/voxel.glsl";
const processingShaderFile = "./shaders/processing.glsl";
const vertexShaderFile = "./shaders/vertex.glsl";

const canvas = document.querySelector("#glcanvas");
const gl = canvas.getContext("webgl2");

const outputCanvas = document.querySelector('#canvas');
const outputCtx = outputCanvas.getContext('2d');

const voxelShader = createShaderProgram(vertexShaderFile, voxelShaderFile);
const processingShader = createShaderProgram(vertexShaderFile, processingShaderFile);

// Target Image
var texture = null;
var targetImage = null;
var pixelData = null;
var processedImage = null;
var framebuffer = null;
var palette = null;

// Processing
var brightness = 1.0;
var contrast = 1.0;
var saturation = 1.0;

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
const depthStep = 0.41234678;

// States
var voxelizing = false;
var requestStop = false;

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

function createTexture(w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const level = 0;
    const internalFormat = gl.RGBA16F;
    const width = w;
    const height = h;
    const border = 0;
    const format = gl.RGBA;
    const type = gl.FLOAT;
    const data = new Float32Array(w * h * 4);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border,
        format, type, data);
    // unless we get `OES_texture_float_linear` we can not filter floating point
    // textures
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    return tex;
}

async function loadTexture(image_url) {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;

    const pixel = new Uint8Array([0, 0, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, 1, 1, 0, srcFormat, srcType, pixel);

    const img = new Image();

    img.src = image_url;
    await img.decode();

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, img);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    
    return img;
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

function setUniforms(w, h, depthStep, camPos, pitch, yaw, fov) {

    var resolutionUniformLocation = gl.getUniformLocation(voxelShader, "u_aspect");
    gl.uniform1f(resolutionUniformLocation, w / h);

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
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.uniform1f(depth_uniform, depth);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function applyProcessing() {
    loadSettingsFromUI();

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(processingShader);

    const brightnessUniform = gl.getUniformLocation(processingShader, "u_brightness");
    gl.uniform1f(brightnessUniform, brightness / 100);

    const contrastUniform = gl.getUniformLocation(processingShader, "u_contrast");
    gl.uniform1f(contrastUniform, contrast / 100);

    const saturationUniform = gl.getUniformLocation(processingShader, "u_saturation");
    gl.uniform1f(saturationUniform, saturation / 100);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    readPixelsAsync(gl.UNSIGNED_BYTE, canvas.width, canvas.height, processedImage);
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
    const foundBlocks = {};

    for (var i = 0; i < canvas.width * canvas.height * 4; i += 4) {
        if (occlusionMask[i / 4] == 1 || pixels[i + 3] < 0.01)
            continue;

        const maxBlock = 1000;
        const key = (pixels[i] + maxBlock) +
            (pixels[i + 1] + maxBlock) * 2 * maxBlock +
            (pixels[i + 2] + maxBlock) * 4 * maxBlock * maxBlock;

        if (foundBlocks[key] == undefined)
            foundBlocks[key] = [];

        foundBlocks[key].push(i);
    }

    return foundBlocks;
}

function updatePalette() {
    const blockSelectorDiv = document.querySelector(".blockList");

    palette = [];
    var index = 0;

    for (const blockSelector of blockSelectorDiv.children) {
        if (blockSelector.children[0].checked) {
            const blockID = blockSelector.children[0].id;
            const rgb = blockSelector.children[1].children[0].innerHTML.split(", ");
            palette.push([blockID, parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2]), index++]);
        }
    }
}

function selectBlockFromPalette(meanColor) {
    var closestBlock = 0;
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

function analyzeBlocks(foundBlocks, pixels, occlusionMask, allowedVariance, output, blocks) {
    for (const key in foundBlocks) {

        const blockPixels = foundBlocks[key];
        var [meanColor, variance] = meanAndVariance(blockPixels);

        if (variance > allowedVariance)
            continue;

        const blockID = selectBlockFromPalette(meanColor);

        const maxBlock = 1000;
        const x = key % (2 * maxBlock) - maxBlock;
        const y = Math.floor(key / (2 * maxBlock)) % (2 * maxBlock) - maxBlock;
        const z = Math.floor(key / (4 * maxBlock * maxBlock)) % (2 * maxBlock) - maxBlock;

        const blockColor = palette[blockID];
        meanColor = [blockColor[1], blockColor[2], blockColor[3]];

        for (const pixel of blockPixels) {
            occlusionMask[pixel / 4] = 1;
            const shade = pixels[pixel + 3];
            output[pixel] = Math.floor(meanColor[0]) * shade;
            output[pixel + 1] = Math.floor(meanColor[1]) * shade;
            output[pixel + 2] = Math.floor(meanColor[2]) * shade;
            output[pixel + 3] = 255;
        }

        blocks.push([blockID, x, y, z]);
    }
}

function placeBlocks(occlusionMask, output, depth, blocks) {
    render(depth);
    readPixelsAsync(gl.FLOAT, canvas.width, canvas.height, pixelData);

    const foundBlocks = hashPixels(pixelData, occlusionMask);
    const allowedVariance = (endVariance - startVariance) * Math.pow((depth - minDepth) / (maxDepth - minDepth), 2.0) + startVariance;

    analyzeBlocks(foundBlocks, pixelData, occlusionMask, allowedVariance, output, blocks);
}

function setupFramebuffer() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    const tex1 = createTexture(canvas.width, canvas.height);

    framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex1, 0);

    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.bindTexture(gl.TEXTURE_2D, texture);
}

function loadSettingsFromUI() {
    minDepth = parseFloat(document.querySelector('#depth-min-number').value);
    maxDepth = parseFloat(document.querySelector('#depth-max-number').value);
    startVariance = parseFloat(document.querySelector('#variance-min-number').value);
    endVariance = parseFloat(document.querySelector('#variance-max-number').value);
    fov = parseFloat(document.querySelector('#fov-number').value);
    pitch = parseFloat(document.querySelector('#pitch-number').value);
    yaw = parseFloat(document.querySelector('#yaw-number').value);
    brightness = parseFloat(document.querySelector('#brightness-number').value);
    contrast = parseFloat(document.querySelector('#contrast-number').value);
    saturation = parseFloat(document.querySelector('#saturation-number').value);
}

function voxelConvert() {
    if (voxelizing) {
        requestStop = true;
        setTimeout(() => { voxelConvert(); }, 100);
        return;
    }
    requestStop = false;
    voxelizing = true;

    loadSettingsFromUI();
    gl.useProgram(voxelShader);
    setupFramebuffer();
    setUniforms(canvas.width, canvas.height, depthStep, camPos, pitch, yaw, fov);

    var output = new Uint8Array(canvas.width * canvas.height * 4);
    var occlusionMask = new Int8Array(canvas.width * canvas.height * 1);
    pixelData = new Float32Array(canvas.width * canvas.height * 4);

    var blocks = [];
    var depth = minDepth;
    const timer = setInterval(() => {
        placeBlocks(occlusionMask, output, depth, blocks);

        depth += depthStep;

        var UAC = new Uint8ClampedArray(output, canvas.width, canvas.height);
        var imageData = new ImageData(UAC, canvas.width, canvas.height);
        outputCtx.putImageData(imageData, 0, 0);

        console.log("Depth: " + depth);

        if (depth > maxDepth || requestStop) {
            voxelizing = false;
            clearInterval(timer);
            console.log(blocks);
        }
    }, 0);
}

async function updateTargetImage() {
    const img = await loadTexture(DEFAULT_TARGET);
    canvas.width = img.width;
    canvas.height = img.height;
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;
    processedImage = new Uint8Array(canvas.width * canvas.height * 4);
    
    // Get pixels from image
    var temp = document.createElement('canvas');
    var tempCTX = temp.getContext('2d');
    temp.width = img.width;
    temp.height = img.height;
    tempCTX.drawImage(img, 0, 0);


    const targetImageUniform = gl.getUniformLocation(processingShader, "u_targetImage");
    gl.uniform1i(targetImageUniform, 0);

    gl.viewport(0, 0, canvas.width, canvas.height);
    applyProcessing();
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

    await updateTargetImage();
    updatePalette();
}

main();

export { voxelConvert, updateTargetImage, updatePalette, applyProcessing };