import { image_update } from "./gui.js";
import { voxelConvert } from "./script.js";

import Animator from "./animator.js";

const FRAMERATE = 15;
const DOWNLOAD_ZIP = false;
const DOWNLOAD_GIF = true;
const KEYFRAME_FILE = 'keyframes/badApple.json';

var animator = null;

function init() {
    animator = new Animator(KEYFRAME_FILE);
    
    const values = animator.initialValues;

    for (let property in values) {
        const input = document.getElementById(property + '-number');
        input.value = values[property];
        input.dispatchEvent(new Event('change'));
    }
}

async function updateViewParams(frame) {
    const values = animator.getValuesAtFrame(frame);
    console.log(values);

    for (let property in values) {
        const input = document.getElementById(property + '-number');
        let targetValue = values[property];

        if (property === 'yaw') {
            targetValue = (targetValue + 180) % 360 - 180;
        }

        if (property === 'pitch') {
            targetValue = (targetValue + 90) % 180 - 90;
        }

        if (property === 'roll') {
            targetValue = (targetValue + 180) % 360 - 180;
        }

        input.value = targetValue;
        input.dispatchEvent(new Event('change'));
    }

    await new Promise(r => setTimeout(r, 20));
}

function processBatch() {
    init();

    var files = document.getElementById('image-input').files;
    var startFrame = parseInt(files[0].name.replace(/\.[^/.]+$/, ""));
    var filesLength = files.length;
    console.log("Start frame: " + startFrame);

    var output_ZIP = new window.JSZip();
    var output_GIF = new window.GIF({
        workers: 2,
        quality: 10
    });

    var i = 0;
    const callback = async function() {
        if (i >= filesLength)
        {
            if(DOWNLOAD_ZIP)
                output_ZIP.generateAsync({type:"blob"})
                .then(function(content) {
                    var promise = null;
                    if (JSZip.support.uint8array) {
                        promise = output_ZIP.generateAsync({type : "uint8array"});
                    } else {
                        promise = output_ZIP.generateAsync({type : "string"});
                    }

                    // Download the zip file
                    promise.then(function(content) {
                        var blob = new Blob([content], {type: "application/zip"});
                        var url = window.URL.createObjectURL(blob);
                        var a = document.createElement('a');
                        a.href = url;
                        a.download = 'batch.zip';
                        a.click();
                        window.URL.revokeObjectURL(url);
                    });
                    
                });

            if(DOWNLOAD_GIF){
                output_GIF.render();

                // Download the gif file
                output_GIF.on('finished', function(blob) {
                    var url = window.URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url;
                    a.download = 'batch.gif';
                    a.click();
                    window.URL.revokeObjectURL(url);
                });
                
            }
            return;
        }

        // VOXELIZE
        await updateViewParams(i + startFrame);

        voxelConvert().then(() => {

            // EXPORT SCREENSHOT
            const resultCanvas = document.getElementById('canvas');
            const resultImage = resultCanvas.toDataURL('image/png');
            const fileName = files[i].name.replace(/\.[^/.]+$/, "") + ".png";

            console.log(fileName);

            output_ZIP.file(fileName, resultImage.substr(resultImage.indexOf(',') + 1), {base64: true});
            output_GIF.addFrame(resultCanvas, {copy: true, delay: 1000 / FRAMERATE});

            if (i++ < filesLength) {
                setTimeout(() => { 
                    image_update(i, callback); 
                }, 10);
            }
        });
    };

    image_update(0, callback); 
}

export { processBatch };