//import * as Magick from "wasm-imagemagick";

var Magick = require("wasm-imagemagick");
console.log(Magick);

//import { buildInputFile, execute, loadImageElement } from 'wasm-imagemagick'


const { outputFiles, exitCode } = await Magick.execute({
    inputFiles: [await Magick.buildInputFile('./res/ganyu3_t.png')],
    commands: [
        'convert ./res/ganyu3_t.png -brightness-contrast 10x10 out.png',
    ],
})
if (exitCode !== 0)
    await Magick.loadImageElement(outputFiles[0], document.getElementById('image'))
