import { voxelConvert } from "./script.js";

document.getElementById ("convertButton").addEventListener ("click", voxelConvert, false);

var brightness_slider = document.querySelector('#brightness-slider');
var brightness_number = document.querySelector('#brightness-number');
brightness_slider.addEventListener("input", brightness_updateSlider);
function brightness_updateSlider() {
    //copying the slider values to the numbers
    brightness_number.value = brightness_slider.value;
}
brightness_number.addEventListener("change", brightness_updateNumber);
function brightness_updateNumber() {
    //change the user text to a number
    brightness_number.value = parseInt(brightness_number.value) || brightness_number.min;
    brightness_number.value = Math.min(brightness_number.max, Math.max(brightness_number.min, brightness_number.value));
    //copying the number values to the slider
    brightness_slider.value = brightness_number.value;
}
var contrast_slider = document.querySelector('#contrast-slider');
var contrast_number = document.querySelector('#contrast-number');
contrast_slider.addEventListener("input", contrast_updateSlider);
function contrast_updateSlider() {
    //copying the slider values to the numbers
    contrast_number.value = contrast_slider.value;
}
contrast_number.addEventListener("change", contrast_updateNumber);
function contrast_updateNumber() {
    //change the user text to a number
    contrast_number.value = parseInt(contrast_number.value) || contrast_number.min;
    contrast_number.value = Math.min(contrast_number.max, Math.max(contrast_number.min, contrast_number.value));
    //copying the number values to the slider
    contrast_slider.value = contrast_number.value;
}
var saturation_slider = document.querySelector('#saturation-slider');
var saturation_number = document.querySelector('#saturation-number');
saturation_slider.addEventListener("input", saturation_updateSlider);
function saturation_updateSlider() {
    //copying the slider values to the numbers
    saturation_number.value = saturation_slider.value;
}
saturation_number.addEventListener("change", saturation_updateNumber);
function saturation_updateNumber() {
    //change the user text to a number
    saturation_number.value = parseInt(saturation_number.value) || saturation_number.min;
    saturation_number.value = Math.min(saturation_number.max, Math.max(saturation_number.min, saturation_number.value));
    //copying the number values to the slider
    saturation_slider.value = saturation_number.value;
}

var preprocessing_checkbox = document.querySelector('#preprocessing-checkbox');
preprocessing_checkbox.addEventListener("change", preprocessing_update);
function preprocessing_update() {
    brightness_slider.disabled = !preprocessing_checkbox.checked;
    brightness_number.disabled = !preprocessing_checkbox.checked;
    contrast_slider.disabled = !preprocessing_checkbox.checked;
    contrast_number.disabled = !preprocessing_checkbox.checked;
    saturation_slider.disabled = !preprocessing_checkbox.checked;
    saturation_number.disabled = !preprocessing_checkbox.checked;

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
    pitch_number.value = parseInt(pitch_number.value) || pitch_number.min;
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
    yaw_number.value = parseInt(yaw_number.value) || yaw_number.min;
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