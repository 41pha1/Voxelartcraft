import litemapy as lt
import numpy as np
import cv2 as cv
import os

block_file = "blocks.txt"
block_ids = "blocks/ids.txt"

ids = {}

with open(block_ids, "r") as f:
    while True:
        line = f.readline()
        if line == "":
            break
        
        id = line.split(" ")[0].split("\n")[0]
        ids[id] = True


def matchTextures(voxels, textures):
    meanTextures = {}
    for tex in textures:
        meanTextures[tex] = np.mean(textures[tex][:,:,:3], axis=(0,1))

    matched = {}
    for voxel in voxels:
        bestMatch = None
        bestMatchDiff = np.inf

        for tex in textures:
            diff = np.linalg.norm(meanTextures[tex] - voxel[1][:3])
            if diff < bestMatchDiff:
                bestMatch = tex
                bestMatchDiff = diff
        
        matched[(voxel[0][0], voxel[0][1], voxel[0][2])] = bestMatch

    return matched

texture_folder = "blocks/"
def loadTextures():
    # load all pngs in texture_folder
    textures = {}
    for file in os.listdir(texture_folder):
        if file.endswith(".png"):
            name = file.split(".")[0]
            tex_bgr = cv.imread(texture_folder + file, cv.IMREAD_COLOR)
            tex_rgba = cv.cvtColor(tex_bgr, cv.COLOR_BGR2BGRA)
            textures[name] = tex_rgba
    return textures

voxel = []
with open(block_file, "r") as f:
    while True:
        line = f.readline()
        if line == "":
            break
        
        line = line.split(" ")
        coords = [int(x) for x in line[:3]]
        rgb = [float(x) for x in line[3:6]]
        voxel.append((coords, rgb))

textures = loadTextures()
matched = matchTextures(voxel, textures)

def getBounds(blocks):
    min_x = np.inf
    min_y = np.inf
    min_z = np.inf
    max_x = -np.inf
    max_y = -np.inf
    max_z = -np.inf

    for coords in blocks.keys():
        x,y,z = coords
        min_x = min(min_x, x)
        min_y = min(min_y, y)
        min_z = min(min_z, z)
        max_x = max(max_x, x) 
        max_y = max(max_y, y)
        max_z = max(max_z, z)

    max_x += 1
    max_y += 1
    max_z += 1
    return min_x, min_y, min_z, max_x, max_y, max_z

bounds = getBounds(matched)

print("Bounds: " + str(bounds))
region = lt.Region(0, 0, 0, bounds[3] - bounds[0], bounds[4] - bounds[1], bounds[5] - bounds[2])
schematic = region.as_schematic(name = "voxels", author = "a1pha1", description = "Perspective Art")

for coords, tex_name in matched.items():
    x,y,z = coords
    x -= bounds[0]
    y -= bounds[1]
    z -= bounds[2]

    blockID = "minecraft:" + tex_name

    if blockID not in ids:
        print("Unknown block ID: " + blockID)
        continue
    
    state = lt.BlockState(blockID)
    region.setblock(x,y,z,state)

print("Schematic contains " + str(len(matched)) + " blocks")
print("Saving schematic...")
schematic.save("out.litematic")