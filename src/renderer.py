import numpy as np
import cv2 as cv
import pandas as pd
import pstats
from glumpy import app, gl, glm, gloo

# CAMERA SETTINGS
fov = 65.
camPos = 0.7, 1.62, 0.7
pitch = np.arcsin(1 / np.sqrt(3)) * 180 / np.pi
yaw = 45.

# QUALITY SETTINGS
texN = 1000
minDepth = 50.
maxDepth = 400.
minVisibility = 0.5
maxVariance = 350
depthStep = 0.75

# INPUT/OUTPUT SETTINGS
input_file = "target.webp"
output_file = "blocks.txt"

vertex = '''
    attribute vec2 position;
    varying vec2 v_texcoord;

    void main (void)
    {
        v_texcoord = position;
        gl_Position = vec4(position, 0.0, 1.0);
    } '''
fragment = open("src/fragment.glsl").read()

def getResult(depth):
    quad['u_depth'] = depth

    framebuffer.activate()
    quad.draw(gl.GL_TRIANGLE_STRIP)
    result = framebuffer.color[0].get()
    framebuffer.deactivate()

    return result

def placeBlocks(texture, target, occlusionMask, output, depth):
    allowedVariance = maxVariance * ((depth-minDepth) / (maxDepth - minDepth)) ** 1.

    placed = {}

    indices = np.array(np.where((occlusionMask < 0.5) & (texture[:,:,3] > 0.01))).T
    
    if len(indices) == 0:
        return placed
    
    blockCoords = np.array(texture[indices[:,0], indices[:,1], :3], dtype=np.int32)
    
    #put indices and blockCoords into a 3d dataframe
    df_rays = pd.DataFrame()
    df_rays['x'] = blockCoords[:,0]
    df_rays['y'] = blockCoords[:,1]
    df_rays['z'] = blockCoords[:,2]
    df_rays['tx'] = indices[:,0]
    df_rays['ty'] = indices[:,1]

    rays = df_rays.groupby(['x', 'y', 'z']).apply(lambda x: np.array(x[['tx', 'ty']].values)).reset_index()
    
    #iterate over each block
    for x,y, z, texels in rays.itertuples(index=False):
        texels = np.array(texels)
        pixels = target[texels[:,0], texels[:,1], :3]

        meanColor = np.mean(pixels, axis=0)
        dif = pixels - meanColor
        varR = np.dot(dif[:,0], dif[:,0]) / len(dif)
        varG = np.dot(dif[:,1], dif[:,1]) / len(dif)
        varB = np.dot(dif[:,2], dif[:,2]) / len(dif)
        variance = max(varR, varG, varB)

        if variance > allowedVariance:
            continue
        
        placed[(x,y,z)] = meanColor
        occlusionMask[texels[:,0], texels[:,1]] = 1.0

        #Visualize
        output[texels[:,0], texels[:,1]] = meanColor * texture[texels[:,0], texels[:,1], 3][:,None]

    return placed


def addAlignmentBlocks(placed):
    placed[(0,-1,0)] = np.array([255, 255, 255])
    placed[(0,0,1)] = np.array([255, 255, 255])
    placed[(1,0,0)] = np.array([255, 255, 255])

def setup(w, h, target_image):
    global quad, texture, framebuffer

    window = app.Window(width=w, height=h)
    window.hide()

    quad = gloo.Program(vertex, fragment, count=4)
    quad['position'] = [(-1,-1), (-1,+1), (+1,-1), (+1,+1)] 
    quad['u_aspect'] = w / h    
    quad['u_depthStep'] = depthStep
    quad['u_camPos'] = camPos
    quad['u_pitch'] = pitch
    quad['u_yaw'] = yaw
    quad['u_fov'] = fov
    quad['u_alphaMask'] = target_image

    quad['u_projection'] = glm.perspective(fov, w / h, 0.1, 1000.0)
    forward = np.array([
        np.cos(np.radians(pitch)) * np.sin(np.radians(yaw)),
        np.sin(np.radians(pitch)),
        np.cos(np.radians(pitch)) * np.cos(np.radians(yaw))
    ])
    quad['u_view'] = glm.lookAt(camPos, camPos + forward)

    texture = np.zeros((h,w,4),np.float32).view(gloo.TextureFloat2D)
    framebuffer = gloo.FrameBuffer(color=[texture])

def main():
    target_image = cv.imread(input_file, cv.IMREAD_UNCHANGED)

    if target_image.shape[2] == 3:
        target_image = cv.cvtColor(target_image, cv.COLOR_BGR2BGRA)
    h, w = target_image.shape[:2]

    target_image = cv.resize(target_image, (texN, int(texN * h / w)), interpolation=cv.INTER_AREA)
    h, w = target_image.shape[:2]
    output_image = np.zeros((h, w, 3), dtype=np.uint8)

    occlusionMask = np.zeros((h,w),np.float32)
    output = np.zeros((h,w,3),np.float32)

    setup(w, h, target_image)

    # result = getResult(100.) * 255.
    # result[:,:,:3] = target_image[:,:,:3]
    # cv.imwrite("screenshot.png", result)

    depth = minDepth
    placed = {}
    while depth < maxDepth:
        result = getResult(depth)
        newPlaced = placeBlocks(result, target_image, occlusionMask, output, depth)
        placed.update(newPlaced)

        print("Depth", depth, " Placed", len(newPlaced), " Total", len(placed))
        depth += 0.41234
        
        #Visualize
        screenshot = np.concatenate((output, occlusionMask[:,:,None] * 255), axis=2)
        cv.imwrite("screenshot.png", screenshot)

    addAlignmentBlocks(placed)
    # save result
    with open(output_file, 'wb') as f:
        for block, color in placed.items():
            line = str(block[0]) + " " + str(block[1]) + " " + str(block[2]) + " " + str(color[0]) + " " + str(color[1]) + " " + str(color[2]) + "\n"
            f.write(line.encode('utf-8'))

if __name__ == '__main__':
    main()

# TODO:
# - Faster rendering
# - Check missing blocks
# - Min visibility
# - Minecraft lighting
# - Dynamic render resolution
# - 3d Dithering?
    
# FUTURE:
# - Perspective Art Website
# - Advertisment on reddit and youtube