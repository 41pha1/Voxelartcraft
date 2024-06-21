import { image_update } from "./gui.js";
import { voxelConvert } from "./script.js";


function lerp (start, end, amt){
    return (1-amt)*start+amt*end
}

async function setupViewParams(frame, frameCount) {
    // const fov_number_input = document.getElementById('fov-number');

    // const INIT_FOV = 60;
    // const MAX_FOV = 30;

    // const newFov = lerp(INIT_FOV, MAX_FOV, frame / frameCount);

    // fov_number_input.value = newFov;
    // fov_number_input.dispatchEvent(new Event('change'));

    // const yaw_number_input = document.getElementById('yaw-number');

    // const INIT_YAW = 0;
    // const MAX_YAW = 360;

    // const newYaw = lerp(INIT_YAW, MAX_YAW, frame / frameCount);

    // yaw_number_input.value = (newYaw + 180) % 360 - 180;
    // yaw_number_input.dispatchEvent(new Event('change'));

    await new Promise(r => setTimeout(r, 20));
}

function processBatch() {
    var files = document.getElementById('image-input').files;
    var filesLength = files.length;

    var output_ZIP = new window.JSZip();

    console.log(output_ZIP);

    var i = 0;

    const callback = async function() {
        if (i >= filesLength)
        {
            // Generate the zip file asynchronously
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
            return;
        }

        // VOXELIZE
        await setupViewParams(i, filesLength);
        voxelConvert().then(() => {

            // EXPORT SCREENSHOT
            const resultCanvas = document.getElementById('canvas');
            const resultImage = resultCanvas.toDataURL('image/png');
            const fileName = files[i].name.replace(/\.[^/.]+$/, "") + ".png";

            console.log(fileName);

            output_ZIP.file(fileName, resultImage.substr(resultImage.indexOf(',') + 1), {base64: true});

            // EXPORT BLUEPRINT
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