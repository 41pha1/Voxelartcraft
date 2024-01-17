import * as NBT from "https://cdn.jsdelivr.net/npm/nbtify/dist/index.min.js";
import { NBTData, Int32 } from "https://cdn.jsdelivr.net/npm/nbtify/dist/index.min.js";

function addAlignmentBlocks(blocks, palette){
    const alignementBlockType = "target";

    // check if alignment block is already in palette
    var alignmentBlockIndex = -1;
    for (var i = 0; i < palette.length; i++) {
        if (palette[i][0] == alignementBlockType) {
            alignmentBlockIndex = i;
            break;
        }
    }

    // add alignment block to palette if not already present
    if (alignmentBlockIndex == -1) {
        alignmentBlockIndex = palette.length - 1;
        palette.push([alignementBlockType, 0, 0, 0, alignmentBlockIndex]);
    }

    // add alignment blocks
    blocks.push([alignmentBlockIndex, 0, -1, 0]);
    blocks.push([alignmentBlockIndex, 0, 0, 1]);
    blocks.push([alignmentBlockIndex, 1, 0, 0]);
}

async function createStructureNBT(blocks, palette){
    console.log("Creating NBT file...");
    
    addAlignmentBlocks(blocks, palette);

    const DataVersion = new Int32(3105);

    var xmin = 0;
    var xmax = 0;
    var ymin = 0;
    var ymax = 0;
    var zmin = 0;
    var zmax = 0;

    for (var i = 0; i < blocks.length; i++) {
        const block = blocks[i];

        if (block[1] < xmin) {
            xmin = block[1];
        }
        if (block[1] > xmax) {
            xmax = block[1];
        }
        if (block[2] < ymin) {
            ymin = block[2];
        }
        if (block[2] > ymax) {
            ymax = block[2];
        }
        if (block[3] < zmin) {
            zmin = block[3];
        }
        if (block[3] > zmax) {
            zmax = block[3];
        }
    }

    const size = [new Int32(xmax - xmin + 1), new Int32(ymax - ymin + 1), new Int32(zmax - zmin + 1)];

    const paletteArray = [];
    for (const entry of palette) {
        const blockState = {
            Name: "minecraft:" + entry[0]
        };
        paletteArray.push(blockState);
    }

    const blocksArray = [];
    for (var i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const blockState = {
          state: new Int32(block[0]), 
          pos: [new Int32(block[1] - xmin), new Int32(block[2] - ymin), new Int32(block[3] - zmin)],
      };
      blocksArray.push(blockState);
    }

    const nbt = new NBTData({
        DataVersion: DataVersion,
        author: "PerspectiveArt",
        size: size,
        palette: paletteArray,
        blocks: blocksArray,
        entities: [],
    },{ rootName: "", endian: "big", compression: "gzip", bedrockLevel: null });
    
    const nbtBuffer = await NBT.write(nbt);
    const file = new File([nbtBuffer], "structure.nbt");

    return file;
}

export { createStructureNBT };