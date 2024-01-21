import { voxelConvert, applyProcessing, downloadNBT, updateTargetImage, stopVoxelization } from "./script.js";

document.getElementById("convertButton").addEventListener("click", voxelConvert, false);
document.getElementById("downloadButton").addEventListener("click", downloadNBT, false);

const image_input = document.querySelector('#image-input');
image_input.addEventListener("change", image_update);

function image_update() {
    stopVoxelization();
    const img = document.querySelector('#image-input').files[0];

    const image = new Image();
    const resolution = parseInt(resolution_number.value);

    image.onload = function () {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const aspect = image.width / image.height;
        console.log(aspect);

        if (aspect > 1) {
            canvas.width = resolution;
            canvas.height = resolution / aspect;
        } else {
            canvas.width = resolution * aspect;
            canvas.height = resolution;
        }

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL();

        const scaled = new Image();
        scaled.onload = function () { updateTargetImage(scaled); }
        scaled.src = dataURL;
    }

    image.src = URL.createObjectURL(img);
}

const discretize_checkbox = document.querySelector('#discretize-checkbox');
discretize_checkbox.addEventListener("change", discretize_update);

function discretize_update() {
    applyProcessing();
}

var resolution_slider = document.querySelector('#resolution-slider');
var resolution_number = document.querySelector('#resolution-number');
resolution_slider.addEventListener("input", resolution_updateSlider);
function resolution_updateSlider() {
    //copying the slider values to the numbers
    resolution_number.value = Math.floor(Math.pow(2, resolution_slider.value));
    image_update();
}
resolution_number.addEventListener("change", resolution_updateNumber);
function resolution_updateNumber() {
    //change the user text to a number
    resolution_number.value = parseInt(resolution_number.value) || resolution_number.min;
    resolution_number.value = Math.min(resolution_number.max, Math.max(resolution_number.min, resolution_number.value));
    //copying the number values to the slider
    resolution_slider.value = Math.floor(Math.log2(resolution_number.value));
    image_update();
}

var brightness_slider = document.querySelector('#brightness-slider');
var brightness_number = document.querySelector('#brightness-number');
brightness_slider.addEventListener("input", brightness_updateSlider);
function brightness_updateSlider() {
    //copying the slider values to the numbers
    brightness_number.value = brightness_slider.value;
    applyProcessing();
}
brightness_number.addEventListener("change", brightness_updateNumber);
function brightness_updateNumber() {
    //change the user text to a number
    brightness_number.value = parseInt(brightness_number.value) || 0;
    brightness_number.value = Math.min(brightness_number.max, Math.max(brightness_number.min, brightness_number.value));
    //copying the number values to the slider
    brightness_slider.value = brightness_number.value;
    applyProcessing();
}
var contrast_slider = document.querySelector('#contrast-slider');
var contrast_number = document.querySelector('#contrast-number');
contrast_slider.addEventListener("input", contrast_updateSlider);
function contrast_updateSlider() {
    //copying the slider values to the numbers
    contrast_number.value = contrast_slider.value;
    applyProcessing();
}
contrast_number.addEventListener("change", contrast_updateNumber);
function contrast_updateNumber() {
    //change the user text to a number
    contrast_number.value = parseInt(contrast_number.value) || 0;
    contrast_number.value = Math.min(contrast_number.max, Math.max(contrast_number.min, contrast_number.value));
    //copying the number values to the slider
    contrast_slider.value = contrast_number.value;
    applyProcessing();
}
var saturation_slider = document.querySelector('#saturation-slider');
var saturation_number = document.querySelector('#saturation-number');
saturation_slider.addEventListener("input", saturation_updateSlider);
function saturation_updateSlider() {
    //copying the slider values to the numbers
    saturation_number.value = saturation_slider.value;
    applyProcessing();
}
saturation_number.addEventListener("change", saturation_updateNumber);
function saturation_updateNumber() {
    //change the user text to a number
    saturation_number.value = parseInt(saturation_number.value) || 0;
    saturation_number.value = Math.min(saturation_number.max, Math.max(saturation_number.min, saturation_number.value));
    //copying the number values to the slider
    saturation_slider.value = saturation_number.value;
    applyProcessing();
}

var highlights_slider = document.querySelector('#highlights-slider');
var highlights_number = document.querySelector('#highlights-number');
highlights_slider.addEventListener("input", highlights_updateSlider);
function highlights_updateSlider() {
    //copying the slider values to the numbers
    highlights_number.value = highlights_slider.value;
    applyProcessing();
}
highlights_number.addEventListener("change", highlights_updateNumber);
function highlights_updateNumber() {
    //change the user text to a number
    highlights_number.value = parseInt(highlights_number.value) || 0;
    highlights_number.value = Math.min(highlights_number.max, Math.max(highlights_number.min, highlights_number.value));
    //copying the number values to the slider
    highlights_slider.value = highlights_number.value;
    applyProcessing();
}

var shadows_slider = document.querySelector('#shadows-slider');
var shadows_number = document.querySelector('#shadows-number');
shadows_slider.addEventListener("input", shadows_updateSlider);
function shadows_updateSlider() {
    //copying the slider values to the numbers
    shadows_number.value = shadows_slider.value;
    applyProcessing();
}
shadows_number.addEventListener("change", shadows_updateNumber);
function shadows_updateNumber() {
    //change the user text to a number
    shadows_number.value = parseInt(shadows_number.value) || 0;
    shadows_number.value = Math.min(shadows_number.max, Math.max(shadows_number.min, shadows_number.value));
    //copying the number values to the slider
    shadows_slider.value = shadows_number.value;
    applyProcessing();
}

var temperature_slider = document.querySelector('#temperature-slider');
var temperature_number = document.querySelector('#temperature-number');
temperature_slider.addEventListener("input", temperature_updateSlider);
function temperature_updateSlider() {
    //copying the slider values to the numbers
    temperature_number.value = temperature_slider.value;
    applyProcessing();
}
temperature_number.addEventListener("change", temperature_updateNumber);
function temperature_updateNumber() {
    //change the user text to a number
    temperature_number.value = parseInt(temperature_number.value) || 0;
    temperature_number.value = Math.min(temperature_number.max, Math.max(temperature_number.min, temperature_number.value));
    //copying the number values to the slider
    temperature_slider.value = temperature_number.value;
    applyProcessing();
}

var tint_slider = document.querySelector('#tint-slider');
var tint_number = document.querySelector('#tint-number');
tint_slider.addEventListener("input", tint_updateSlider);
function tint_updateSlider() {
    //copying the slider values to the numbers
    tint_number.value = tint_slider.value;
    applyProcessing();
}
tint_number.addEventListener("change", tint_updateNumber);
function tint_updateNumber() {
    //change the user text to a number
    tint_number.value = parseInt(tint_number.value) || 0;
    tint_number.value = Math.min(tint_number.max, Math.max(tint_number.min, tint_number.value));
    //copying the number values to the slider
    tint_slider.value = tint_number.value;
    applyProcessing();
}

// var preprocessing_checkbox = document.querySelector('#preprocessing-checkbox');
// preprocessing_checkbox.addEventListener("change", preprocessing_update);
// function preprocessing_update() {
//     brightness_slider.disabled = !preprocessing_checkbox.checked;
//     brightness_number.disabled = !preprocessing_checkbox.checked;
//     contrast_slider.disabled = !preprocessing_checkbox.checked;
//     contrast_number.disabled = !preprocessing_checkbox.checked;
//     saturation_slider.disabled = !preprocessing_checkbox.checked;
//     saturation_number.disabled = !preprocessing_checkbox.checked;

// }

const pixelart_checkbox = document.querySelector('#pixelart-checkbox');
pixelart_checkbox.addEventListener("change", pixelart_update);
function pixelart_update() {
    var pixelart_hide = document.getElementsByClassName('pixelart-disabled-settings');
    const display = pixelart_checkbox.checked ? 'none' : '';
    for (var i = 0; i < pixelart_hide.length; i++) {
        pixelart_hide[i].style.display = display;
    }
}


var fov_slider = document.querySelector('#fov-slider');
var fov_number = document.querySelector('#fov-number');
fov_slider.addEventListener("input", fov_updateSlider);
function fov_updateSlider() {
    //copying the slider values to the numbers
    fov_number.value = fov_slider.value;
}
fov_number.addEventListener("change", fov_updateNumber);
function fov_updateNumber() {
    //change the user text to a number
    fov_number.value = parseInt(fov_number.value) || fov_number.min;
    fov_number.value = Math.min(fov_number.max, Math.max(fov_number.min, fov_number.value));
    //copying the number values to the slider
    fov_slider.value = fov_number.value;
}
var pitch_slider = document.querySelector('#pitch-slider');
var pitch_number = document.querySelector('#pitch-number');
pitch_slider.addEventListener("input", pitch_updateSlider);
function pitch_updateSlider() {
    //copying the slider values to the numbers
    pitch_number.value = pitch_slider.value;
}
pitch_number.addEventListener("change", pitch_updateNumber);
function pitch_updateNumber() {
    //change the user text to a number
    pitch_number.value = parseInt(pitch_number.value) || 0;
    pitch_number.value = Math.min(pitch_number.max, Math.max(pitch_number.min, pitch_number.value));
    //copying the number values to the slider
    pitch_slider.value = pitch_number.value;
}
var yaw_slider = document.querySelector('#yaw-slider');
var yaw_number = document.querySelector('#yaw-number');
yaw_slider.addEventListener("input", yaw_updateSlider);
function yaw_updateSlider() {
    //copying the slider values to the numbers
    yaw_number.value = yaw_slider.value;
}
yaw_number.addEventListener("change", yaw_updateNumber);
function yaw_updateNumber() {
    //change the user text to a number
    yaw_number.value = parseInt(yaw_number.value) || 0;
    yaw_number.value = Math.min(yaw_number.max, Math.max(yaw_number.min, yaw_number.value));
    //copying the number values to the slider
    yaw_slider.value = yaw_number.value;
}

var depth_min_slider = document.querySelector('#depth-min');
var depth_max_slider = document.querySelector('#depth-max');
var depth_min_number = document.querySelector('#depth-min-number');
var depth_max_number = document.querySelector('#depth-max-number');
var depth_selected = document.getElementById('depth-selected');

depth_min_slider.addEventListener("input", depth_updateMinSlider);
function depth_updateMinSlider() {
    //collision between slider seletors
    depth_max_slider.value = Math.max(depth_max_slider.value, parseInt(depth_min_slider.value));
    //copying the slider values to the numbers
    depth_min_number.value = depth_min_slider.value;
    depth_max_number.value = depth_max_slider.value;
    depth_adjustHighlighting();
}
depth_max_slider.addEventListener("input", depth_updateMaxSlider);
function depth_updateMaxSlider() {
    //collision between slider seletors
    depth_min_slider.value = Math.min(depth_min_slider.value, parseInt(depth_max_slider.value));
    //copying the slider values to the numbers
    depth_min_number.value = depth_min_slider.value;
    depth_max_number.value = depth_max_slider.value;
    depth_adjustHighlighting();
}
depth_min_number.addEventListener("change", depth_updateMinNumber);
function depth_updateMinNumber() {
    //change the user text to a number
    depth_min_number.value = parseInt(depth_min_number.value) || depth_min_number.min;
    depth_min_number.value = Math.min(depth_min_number.max, Math.max(depth_min_number.min, depth_min_number.value));
    //collision between number seletors
    depth_max_number.value = Math.max(depth_max_number.value, parseInt(depth_min_number.value));
    //copying the number values to the slider
    depth_min_slider.value = depth_min_number.value;
    depth_max_slider.value = depth_max_number.value;
    depth_adjustHighlighting();
}
depth_max_number.addEventListener("change", depth_updateMaxNumber);
function depth_updateMaxNumber() {
    //change the user text to a number
    depth_max_number.value = parseInt(depth_max_number.value) || depth_max_number.max;
    depth_max_number.value = Math.min(depth_max_number.max, Math.max(depth_max_number.min, depth_max_number.value));
    //collision between number seletors
    depth_min_number.value = Math.min(depth_min_number.value, parseInt(depth_max_number.value));
    //copying the number values to the slider
    depth_min_slider.value = depth_min_number.value;
    depth_max_slider.value = depth_max_number.value;
    depth_adjustHighlighting();
}

function depth_adjustHighlighting() {
    var right = (depth_max_slider.max - depth_max_slider.value) / (depth_max_slider.max - depth_min_slider.min) * 100;
    depth_selected.style.right = right + '%';
    var left = (depth_min_slider.value - depth_min_slider.min) / (depth_max_slider.max - depth_min_slider.min) * 100;
    depth_selected.style.left = left + '%';
}
depth_updateMaxSlider();
depth_updateMinSlider();


var variance_min_slider = document.querySelector('#variance-min');
var variance_max_slider = document.querySelector('#variance-max');
var variance_min_number = document.querySelector('#variance-min-number');
var variance_max_number = document.querySelector('#variance-max-number');
var variance_selected = document.getElementById('variance-selected');

variance_min_slider.addEventListener("input", variance_updateMinSlider);
function variance_updateMinSlider() {
    //collision between slider seletors
    variance_max_slider.value = Math.max(variance_max_slider.value, parseInt(variance_min_slider.value));
    //copying the slider values to the numbers
    variance_min_number.value = variance_min_slider.value;
    variance_max_number.value = variance_max_slider.value;
    variance_adjustHighlighting();
}
variance_max_slider.addEventListener("input", variance_updateMaxSlider);
function variance_updateMaxSlider() {
    //collision between slider seletors
    variance_min_slider.value = Math.min(variance_min_slider.value, parseInt(variance_max_slider.value));
    //copying the slider values to the numbers
    variance_min_number.value = variance_min_slider.value;
    variance_max_number.value = variance_max_slider.value;
    variance_adjustHighlighting();
}
variance_min_number.addEventListener("change", variance_updateMinNumber);
function variance_updateMinNumber() {
    //change the user text to a number
    variance_min_number.value = parseInt(variance_min_number.value) || variance_min_number.min;
    variance_min_number.value = Math.min(variance_min_number.max, Math.max(variance_min_number.min, variance_min_number.value));
    //collision between number seletors
    variance_max_number.value = Math.max(variance_max_number.value, parseInt(variance_min_number.value));
    //copying the number values to the slider
    variance_min_slider.value = variance_min_number.value;
    variance_max_slider.value = variance_max_number.value;
    variance_adjustHighlighting();
}
variance_max_number.addEventListener("change", variance_updateMaxNumber);
function variance_updateMaxNumber() {
    //change the user text to a number
    variance_max_number.value = parseInt(variance_max_number.value) || variance_max_number.max;
    variance_max_number.value = Math.min(variance_max_number.max, Math.max(variance_max_number.min, variance_max_number.value));
    //collision between number seletors
    variance_min_number.value = Math.min(variance_min_number.value, parseInt(variance_max_number.value));
    //copying the number values to the slider
    variance_min_slider.value = variance_min_number.value;
    variance_max_slider.value = variance_max_number.value;
    variance_adjustHighlighting();
}

function variance_adjustHighlighting() {
    var right = (variance_max_slider.max - variance_max_slider.value) / (variance_max_slider.max - variance_min_slider.min) * 100;
    variance_selected.style.right = right + '%';
    var left = (variance_min_slider.value - variance_min_slider.min) / (variance_max_slider.max - variance_min_slider.min) * 100;
    variance_selected.style.left = left + '%';
}
variance_updateMaxSlider();
variance_updateMinSlider();

const resetSVG = document.querySelector('.refresh-button');
resetSVG.addEventListener("click", reset);

function reset() {
    brightness_slider.value = 0;
    brightness_number.value = 0;
    contrast_slider.value = 0;
    contrast_number.value = 0;
    saturation_slider.value = 0;
    saturation_number.value = 0;
    highlights_slider.value = 0;
    highlights_number.value = 0;
    shadows_slider.value = 0;
    shadows_number.value = 0;
    temperature_slider.value = 0;
    temperature_number.value = 0;
    tint_slider.value = 0;
    tint_number.value = 0;
    discretize_checkbox.checked = true;
    applyProcessing();
}