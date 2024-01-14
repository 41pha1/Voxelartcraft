const DEFAULT_TARGET = './res/ganyu3_t.png';
const vertexShaderFile = "./shaders/vertex.glsl";
const fragmentShaderFile = "./shaders/fragment.glsl";

const canvas = document.querySelector("#glcanvas");
const gl = canvas.getContext("webgl2");
const shaderProgram = initWebgl(vertexShaderFile, fragmentShaderFile);

// Target Image
var texture = null;
var targetImage = null;
var pixelData = null;

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

const readPixelsAsync = function (width, height, buffer) {
    const bufpak = gl.createBuffer();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, bufpak);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, buffer.byteLength, gl.STREAM_READ);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, 0);
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

function initWebgl(vertexShaderFile, fragmentShaderFile) {
    var shaderProgram = gl.createProgram();

    var vertexShader = createShader(gl.VERTEX_SHADER, loadShader(vertexShaderFile));
    var fragmentShader = createShader(gl.FRAGMENT_SHADER, loadShader(fragmentShaderFile));

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);

    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);

    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    var vertices = [-1.0, 1.0, 0.0,
    -1.0, -1.0, 0.0,
        1.0, 1.0, 0.0,
        1.0, -1.0, 0.0];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    var positionAttribLocation = gl.getAttribLocation(shaderProgram, "position");
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

    return shaderProgram;
}

function setUniforms(w, h, depthStep, camPos, pitch, yaw, fov) {

    var resolutionUniformLocation = gl.getUniformLocation(shaderProgram, "u_aspect");
    gl.uniform1f(resolutionUniformLocation, w / h);

    var depthStepUniformLocation = gl.getUniformLocation(shaderProgram, "u_depthStep");
    gl.uniform1f(depthStepUniformLocation, depthStep);

    var camPosUniformLocation = gl.getUniformLocation(shaderProgram, "u_camPos");
    gl.uniform3fv(camPosUniformLocation, camPos);

    var pitchUniformLocation = gl.getUniformLocation(shaderProgram, "u_pitch");
    gl.uniform1f(pitchUniformLocation, pitch);

    var yawUniformLocation = gl.getUniformLocation(shaderProgram, "u_yaw");
    gl.uniform1f(yawUniformLocation, yaw);

    var fovUniformLocation = gl.getUniformLocation(shaderProgram, "u_fov");
    gl.uniform1f(fovUniformLocation, fov);

    var alphaMaskUniformLocation = gl.getUniformLocation(shaderProgram, "u_alphaMask");
    gl.uniform1i(alphaMaskUniformLocation, 0);

    var projectionUniformLocation = gl.getUniformLocation(shaderProgram, "u_projection");
    var perspective = glm.perspective(glm.radians(fov), w / h, 0.1, 1000.0);
    perspective = new Float32Array(perspective.elements);
    gl.uniformMatrix4fv(projectionUniformLocation, false, perspective);

    var viewUniformLocation = gl.getUniformLocation(shaderProgram, "u_view");
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

    depth_uniform = gl.getUniformLocation(shaderProgram, "u_depth");

    gl.viewport(0, 0, canvas.width, canvas.height);
}

function render(depth) {
    gl.uniform1f(depth_uniform, depth);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function meanAndVariance(pixels) {
    var meanColor = [0., 0., 0.];

    for (const pixel of pixels) {
        meanColor[0] += targetImage[pixel];
        meanColor[1] += targetImage[pixel + 1];
        meanColor[2] += targetImage[pixel + 2];
    }
    meanColor[0] /= pixels.length;
    meanColor[1] /= pixels.length;
    meanColor[2] /= pixels.length;

    var variance = [0., 0., 0.];

    for (const pixel of pixels) {
        variance[0] += Math.pow(targetImage[pixel + 0] - meanColor[0], 2);
        variance[1] += Math.pow(targetImage[pixel + 1] - meanColor[1], 2);
        variance[2] += Math.pow(targetImage[pixel + 2] - meanColor[2], 2);
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

function analyzeBlocks(foundBlocks, pixels, occlusionMask, allowedVariance, output) {
    for (const key in foundBlocks) {
        // var z = key % 256;
        // var y = Math.floor(key / 256) % 256;
        // var x = Math.floor(key / (256 * 256));

        const blockPixels = foundBlocks[key];
        var [meanColor, variance] = meanAndVariance(blockPixels);

        if (variance > allowedVariance)
            continue;

        for (const pixel of blockPixels) {
            occlusionMask[pixel / 4] = 1;
            const shade = pixels[pixel + 3];
            output[pixel] = Math.floor(meanColor[0]) * shade;
            output[pixel + 1] = Math.floor(meanColor[1]) * shade;
            output[pixel + 2] = Math.floor(meanColor[2]) * shade;
            output[pixel + 3] = 255;
        }
    }
}

function placeBlocks(occlusionMask, output, depth) {
    render(depth);

    readPixelsAsync(canvas.width, canvas.height, pixelData);

    const foundBlocks = hashPixels(pixelData, occlusionMask);
    const allowedVariance = (endVariance - startVariance) * Math.pow((depth - minDepth) / (maxDepth - minDepth), 2.0) + startVariance;

    analyzeBlocks(foundBlocks, pixelData, occlusionMask, allowedVariance, output);
}

function setupFramebuffer() {
    const tex1 = createTexture(canvas.width, canvas.height);

    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex1, 0);

    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.bindTexture(gl.TEXTURE_2D, texture);
}

function displayOnPreview(img, canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
}

function loadSettingsFromUI() {
    minDepth = parseFloat(document.querySelector('#depth-min-number').value);
    maxDepth = parseFloat(document.querySelector('#depth-max-number').value);
    startVariance = parseFloat(document.querySelector('#variance-min-number').value);
    endVariance = parseFloat(document.querySelector('#variance-max-number').value);
    fov = parseFloat(document.querySelector('#fov-number').value);
    pitch = parseFloat(document.querySelector('#pitch-number').value);
    yaw = parseFloat(document.querySelector('#yaw-number').value);
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
    setupFramebuffer();
    setUniforms(canvas.width, canvas.height, depthStep, camPos, pitch, yaw, fov);

    var output = new Uint8Array(canvas.width * canvas.height * 4);
    var occlusionMask = new Int8Array(canvas.width * canvas.height * 1);
    pixelData = new Float32Array(canvas.width * canvas.height * 4);

    var outputCanvas = document.querySelector('#canvas');
    var outputCtx = outputCanvas.getContext('2d');
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;

    var depth = minDepth;

    const timer = setInterval(() => {
        placeBlocks(occlusionMask, output, depth);

        depth += depthStep;

        var UAC = new Uint8ClampedArray(output, canvas.width, canvas.height);
        var imageData = new ImageData(UAC, canvas.width, canvas.height);
        outputCtx.putImageData(imageData, 0, 0);

        console.log("Depth: " + depth);

        if (depth > maxDepth || requestStop) {
            voxelizing = false;
            clearInterval(timer);
        }
    }, 0);
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

    const img = await loadTexture(DEFAULT_TARGET);
    canvas.width = img.width;
    canvas.height = img.height;

    const previewCanvas = document.querySelector('#preview');
    displayOnPreview(img, previewCanvas);
    targetImage = previewCanvas.getContext('2d').getImageData(0, 0, img.width, img.height).data;
}

main();

export { voxelConvert };