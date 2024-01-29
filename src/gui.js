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
        const processingCanvas = document.querySelector('.processing-preview');
        const voxelCanvas = document.querySelector('.voxel-preview');
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

const sliders = document.getElementsByClassName('slider');
for (var i = 0; i < sliders.length; i++) {
    sliders[i].addEventListener("input", updateSliderBackground);
    sliders[i].addEventListener("input", updateSlider);
}

const numberInputs = document.getElementsByClassName('number-input');
for (var i = 0; i < numberInputs.length; i++) {
    numberInputs[i].addEventListener("change", function (event) {
        const slider = event.target.closest("tr").querySelector('input[type="range"]');
        const number = event.target;
        number.value = parseInt(number.value) || Math.max(number.min, 0);
        number.value = Math.min(number.max, Math.max(number.min, number.value));
        slider.value = number.value;

        updateSliderBackground({ target: slider});
        applyProcessing();
    } );
}

function updateAllSlidersBackgrounds() {
    for (var i = 0; i < sliders.length; i++) {
        updateSliderBackground({ target: sliders[i].children[0].children[0] });
    }
}
updateAllSlidersBackgrounds();

function updateSliderBackground(event) {
    const sliderDiv = event.target.parentElement.parentElement;
    const slider = sliderDiv.children[1].children[0];
    const sliderProgress = sliderDiv.querySelector('.range-progress');

    const zeroPoint = Math.max(0, slider.min);
    const zeroPercent = (zeroPoint - slider.min) / (slider.max - slider.min) * 100;
    const percent = (slider.value - slider.min) / (slider.max - slider.min) * 100;

    const smallerPercent = Math.min(percent, zeroPercent);
    const largerPercent = Math.max(percent, zeroPercent);

    sliderProgress.style.left = smallerPercent + '%';
    sliderProgress.style.right = (100 - largerPercent) + '%';
}

function updateSlider(event) {
    const slider = event.target;
    const number = slider.closest("tr").querySelector('.number-input');
    number.value = slider.value;
    applyProcessing();
}


const discretize_checkbox = document.querySelector('#discretize-checkbox');
discretize_checkbox.addEventListener("change", discretize_update);

function discretize_update() {
    applyProcessing();
}

const pixelart_checkbox = document.querySelector('#pixelart-checkbox');
pixelart_checkbox.addEventListener("change", pixelart_update);
function pixelart_update() {
    var pixelart_hide = document.getElementsByClassName('pixelart-disabled-settings');
    const display = pixelart_checkbox.checked ? 'none' : '';
    for (var i = 0; i < pixelart_hide.length; i++) {
        pixelart_hide[i].style.display = display;
    }
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
    updateAllSlidersBackgrounds();
}
depth_max_slider.addEventListener("input", depth_updateMaxSlider);
function depth_updateMaxSlider() {
    //collision between slider seletors
    depth_min_slider.value = Math.min(depth_min_slider.value, parseInt(depth_max_slider.value));
    //copying the slider values to the numbers
    depth_min_number.value = depth_min_slider.value;
    depth_max_number.value = depth_max_slider.value;
    updateAllSlidersBackgrounds();
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
    updateAllSlidersBackgrounds();
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
    updateAllSlidersBackgrounds();
}

depth_updateMaxSlider();
depth_updateMinSlider();

const resetSVG = document.querySelector('.refresh-button');
resetSVG.addEventListener("click", reset);

function reset() {
    document.querySelector('#brightness-slider').value = 0;
    document.querySelector('#highlights-slider').value = 0;
    document.querySelector('#shadows-slider').value = 0;
    document.querySelector('#contrast-slider').value = 0;
    document.querySelector('#saturation-slider').value = 0;
    document.querySelector('#temperature-slider').value = 0;
    document.querySelector('#tint-slider').value = 0;

    document.querySelector('#brightness-number').value = 0;
    document.querySelector('#highlights-number').value = 0;
    document.querySelector('#shadows-number').value = 0;
    document.querySelector('#contrast-number').value = 0;
    document.querySelector('#saturation-number').value = 0;
    document.querySelector('#temperature-number').value = 0;
    document.querySelector('#tint-number').value = 0;

    discretize_checkbox.checked = true;
    applyProcessing();
    updateAllSlidersBackgrounds();
}