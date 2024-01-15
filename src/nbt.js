import * as NBT from "https://cdn.jsdelivr.net/npm/nbtify/dist/index.min.js";

const response = await fetch("./test.nbt");
const arrayBuffer = await response.arrayBuffer();
const data = await NBT.read(arrayBuffer);

function createStructureNBT(blocks){
    var nbt = {
        "": {
            "author": "PerspectiveArt",
            "size": [blocks.length, 1, 1],
            "paletteMax": blocks.length,
            "palette": blocks,
            "blocks": []
        }
    }

    for(var i = 0; i < blocks.length; i++){
        nbt[""]["blocks"].push({
            "state": i,
            "pos": [i, 0, 0]
        });
    }

    return nbt;
}