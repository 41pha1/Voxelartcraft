var blockGraph = null; //Map: blockKey -> pixel count, Set(neighborBlockKey, neighborBlockKey, ...)
var sortedBlocks = null; //Array of blockKeys sorted by pixel count, descending
var foundOrderLookup = null;

function dither(blockKeyImage, width, height, palette, blocks) 
{
    if (!blocks || !blockKeyImage || blocks.length == 0 || !palette || palette.length == 0) return [];

    if (!blockGraph) _findNeighbors(blockKeyImage, width, height, blocks.length);
    else _resetError(); 

    var materials = new Array(blocks.length).fill(-1);

    for(var blockKey of sortedBlocks) {
        var targetColor = [blocks[blockKey][0], blocks[blockKey][1], blocks[blockKey][2]];
        const block = blockGraph.get(blockKey);
        const blockError = block.error;                 // error: [r, g, b] / per Block

        for (var c = 0; c < 3; c++) {
            targetColor[c] -= blockError[c]  / block.pixelCount;
            targetColor[c] = Math.max(0, Math.min(255, targetColor[c]));
        }

        const material = _selectBestMaterial(palette, targetColor);   // error: [r, g, b] / per Pixel
        var remainingError = [0.0, 0.0, 0.0];  

        for (var c = 0; c < 3; c++) {
            remainingError[c] = (blocks[blockKey][c] - blockError[c] / block.pixelCount) - palette[material][c + 1];
        }

        materials[blockKey] = material;

        const neighborSet = block.neighbors;

        const distanceScaling = 20.0;
        const errorDecay = 0.75;


        for(var neighborKey of neighborSet) {
            const neighborBlock = blockGraph.get(neighborKey);
            var neighborError =neighborBlock.error;
            console.assert(materials[neighborKey] == -1);

            //  Math.exp(-_distance(block, neighborBlock) / distanceScaling) 
            const weight = errorDecay / neighborSet.size;

            for (var c = 0; c < 3; c++) {
                neighborError[c] -= weight * (remainingError[c] * block.pixelCount);
            }

            neighborBlock.error = neighborError;
        }
    }
    console.assert(materials.every(m => m != -1));

    console.log("Dithering complete");

    return materials;
}

function _distance(block1, block2) {
    var xdis = block1.position[0] - block2.position[0];
    var ydis = block1.position[1] - block2.position[1];
    
    return xdis * xdis + ydis * ydis;
}   

// return palette[4], error (r, g, b)
function _selectBestMaterial(palette, targetColor) {
    var closestBlock = NaN;
    var closestDistance = 10000000

    for (const paletteEntry of palette) {
        const rdis = paletteEntry[1] - targetColor[0];
        const gdis = paletteEntry[2] - targetColor[1];
        const bdis = paletteEntry[3] - targetColor[2];

        const distance = rdis * rdis + gdis * gdis + bdis * bdis;

        if (distance < closestDistance) {
            closestBlock = paletteEntry[4];
            closestDistance = distance;
        }
    }

    return closestBlock;
}

function _maybeAddNeighbor(x, y, width, height, blockKey, blockKeyImage, neighborSet) {
    if (x >= width || y >= height || x < 0 || y < 0) return; // Out of bounds

    var neighborIndex = (y * width + x);
    var neighborKey = blockKeyImage[neighborIndex];

    if (neighborKey === blockKey) return; // Skip same block
    if (neighborKey < 0) return; // Skip transparent pixels
    if (foundOrderLookup[neighborKey] != -1 && foundOrderLookup[neighborKey] < foundOrderLookup[blockKey]) return; 

    neighborSet.add(neighborKey);
}

function _findNeighbors(blockKeyImage, width, height, numBlocks){
    blockGraph = new Map();
    sortedBlocks = new Array(numBlocks);
    foundOrderLookup = new Array(numBlocks).fill(-1);

    var foundCount = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            var index = (y * width + x);
            var blockKey = blockKeyImage[index];

            if (blockKey < 0) continue; // Skip transparent pixels

            if (!blockGraph.has(blockKey)) {
                blockGraph.set(blockKey, { pixelCount: 1, position: [x, y], error: [0.0, 0.0, 0.0], neighbors: new Set() });
        
                foundOrderLookup[blockKey] = foundCount;
                sortedBlocks[foundCount++] = blockKey;
            }else {
                block = blockGraph.get(blockKey);
                block.pixelCount++;
                block.position[0] + x;
                block.position[1] + y;
            }

            var neighborSet = blockGraph.get(blockKey).neighbors;

            for (var dy = -1 ; dy <= 1; dy++) {
                for (var dx = -1; dx <= 1; dx++) {
                    _maybeAddNeighbor(x + dx, y + dy, width, height, blockKey, blockKeyImage, neighborSet);
                }
            }
        }

    }
    for(var i = 0; i < foundCount; i++) {
        var blockKey = sortedBlocks[i];
        var block = blockGraph.get(blockKey);
        block.position[0] /= block.pixelCount;
        block.position[1] /= block.pixelCount;
    }
}

function _resetError() {
    for (const blockKey of sortedBlocks) {
        blockGraph.get(blockKey).error = [0.0, 0.0, 0.0];
    }
}

function resetDither() {
    blockGraph = null;
    sortedBlocks = null;
    foundOrderLookup = null;
}


export { dither, resetDither};