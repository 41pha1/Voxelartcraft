import numpy as np
import cv2 as cv
import os
from perspective import lookat, perspective

#CAMERA
position = np.array([0.7, 1.62, 0.7])
lookingAt = position + np.array([1., 1., 1.])
up = np.array([0., -1., 0.])
fov = 40 * 1.232
near = 0.5

#LIGHT
lightDir = -np.array([0.1, 0.2, 0.5])
lightDir /= np.linalg.norm(lightDir)
ambient = 0.5
light_color = np.array([1., 1., 1.])

#QUALITY SETTINGS
far = 300             #far plane
texN = 16             #texture resolution
maxAlphaOverlap = 10  #pixels
minVisibility = 0.1   #percentage
maxVariance = 0.1     #standard deviation

input_file = "target.jpg"
texture_folder = "blocks/"
output_file = "train"

cube_corners = np.array([
    [0, 0, 0],
    [0, 0, 1],
    [0, 1, 0],
    [0, 1, 1],
    [1, 0, 0],
    [1, 0, 1],
    [1, 1, 0],
    [1, 1, 1]
], dtype=np.float64)
cube_faces = np.array([
    [0, 1, 3, 2],   # -x
    [0, 1, 5, 4],   # -y
    [0, 2, 6, 4],   # -z
    [7, 6, 4, 5],   # +x
    [7, 6, 2, 3],   # +y
    [7, 5, 1, 3]    # +z
])
cube_normals = np.array([
    [-1, 0, 0],
    [0, -1, 0],
    [0, 0, -1],
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
])

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

def projectToScreen(vert, viewProjectionMatrix):
    vert = np.append(vert, 1.)
    projected = np.matmul(viewProjectionMatrix, vert).A1
    depth = projected[3]
    projected /= (projected[3] + 0.0001)
    projected[0] = projected[0] * w/2 + h/2
    projected[1] = projected[1] * h/2 + w/2
    projected = np.round(projected).astype(np.int32)
    return projected[:2], depth

def unwrapFace(img, faces):
    """
    Unwraps a face into a list of edges
    face: list of pixel coordinates of the face on the screen
    """
    faces = np.array(faces, dtype=np.float32)

    dst = np.array([
        [texN, texN],
        [-1, texN],
        [-1, -1],
        [texN, -1],
    ], dtype=np.float32)

    transform_mat = cv.getPerspectiveTransform(faces, dst)
    warped =  cv.warpPerspective(img, transform_mat, (texN, texN), flags=cv.INTER_CUBIC)
    area = cv.contourArea(np.array([[p[0], p[1]] for p in faces]))

    return warped, area

def matchVoxel(img, projected_faces, visible_mask):
    """
    Returns if a voxel is a good match for the target image
    """

    # Unwrap
    imgs = np.zeros((len(projected_faces), texN, texN, 4), dtype=np.uint8)
    visibilities = np.zeros((len(projected_faces), texN, texN), dtype=np.float32)
    areas = np.zeros((len(projected_faces)), dtype=np.float32)

    for i, face in enumerate(projected_faces):
        imgs[i], areas[i] = unwrapFace(img, face)
        visibilities[i], _ = unwrapFace(visible_mask, face)

    tex_area = texN * texN
    total_area = np.sum(areas)

    # Check alpha overlap
    alpha_overlap = total_area - np.sum(imgs[:,:,:,3].T * areas) / (tex_area * 255)
    if alpha_overlap > maxAlphaOverlap:
        return None

    # Check visibility
    visibility = np.sum(visibilities.T * areas) / (tex_area * total_area)
    if visibility < minVisibility:
        return None
    
    # Check variance
    maskedT = imgs.T * visibilities.T
    mean = np.sum(maskedT * areas, axis=(1,2,3)) / (tex_area * total_area * visibility)
    variance = np.sum(visibilities.T * np.square((imgs - mean) / 255).T, axis=(1,2,3)) / (tex_area * visibility)
    variance = np.max(variance)
    variance *= (total_area * visibility) ** 0.5

    if variance > maxVariance:
        return None

    # Calculate average color
    average_color = np.sum(maskedT * areas, axis=(1,2,3)) / (tex_area * total_area * visibility)
    #average_color = np.round(average_color).astype(np.uint8)

    # Update visible mask
    for face in projected_faces:
        cv.fillPoly(visible_mask, [face], 0)

    return average_color

def voxelsInFrustum(viewProjectionMatrix, viewMatrix, nearDistance, farDistance, fov, aspectRatio):
    """
    Returns a list of voxels that are in the frustum
    """
    camPos = np.asarray(viewMatrix[3][:2]).reshape(-1)
    camForward = np.asarray(viewMatrix[2][:2]).reshape(-1)
    camUp = np.asarray(viewMatrix[1][:2]).reshape(-1)
    camRight = np.asarray(viewMatrix[0][:2]).reshape(-1)
    fovRadians = fov * np.pi / 180

    nearCenter = camPos - camForward * nearDistance
    farCenter = camPos - camForward * farDistance

    nearHeight = 2 * np.tan(fovRadians/ 2) * nearDistance
    farHeight = 2 * np.tan(fovRadians / 2) * farDistance
    nearWidth = nearHeight * aspectRatio
    farWidth = farHeight * aspectRatio

    fCorners = np.array([
        farCenter + camUp * (farHeight*0.5) - camRight * (farWidth*0.5),
        farCenter + camUp * (farHeight*0.5) + camRight * (farWidth*0.5),
        farCenter - camUp * (farHeight*0.5) - camRight * (farWidth*0.5),
        farCenter - camUp * (farHeight*0.5) + camRight * (farWidth*0.5),
        nearCenter + camUp * (nearHeight*0.5) - camRight * (nearWidth*0.5),
        nearCenter + camUp * (nearHeight*0.5) + camRight * (nearWidth*0.5),
        nearCenter - camUp * (nearHeight*0.5) - camRight * (nearWidth*0.5),
        nearCenter - camUp * (nearHeight*0.5) + camRight * (nearWidth*0.5)
    ])

    boundingBox = np.array([
        [np.min(fCorners[:,0]), np.min(fCorners[:,1]), np.min(fCorners[:,2])],
        [np.max(fCorners[:,0]), np.max(fCorners[:,1]), np.max(fCorners[:,2])]
    ])

    voxelsInFrustum = []

    for x in range(int(boundingBox[0][0])-1, int(boundingBox[1][0]+1)):
        for y in range(int(boundingBox[0][1]-1), int(boundingBox[1][1]+1)):
            for z in range(int(boundingBox[0][2]-1), int(boundingBox[1][2]+1)):

                voxelCenter = np.array([x, y, z])
                screen_coord, depth = projectToScreen(np.array([x, y, z]), viewProjectionMatrix)
                if depth > near and depth < far and screen_coord[0] >= 0 and screen_coord[0] < h and screen_coord[1] >= 0 and screen_coord[1] < w:
                    voxelsInFrustum.append((voxelCenter, screen_coord, depth))
                                
    print(len(voxelsInFrustum))
    return voxelsInFrustum

def visibleFaces(cubeCenter, cameraPos):
    """
    Returns a list of faces that are visible from the camera
    """
    visibleFaces = []
    direction = cameraPos - cubeCenter
    for i in range(len(cube_normals)):
        if np.dot(cube_normals[i], direction) > 0:
            visibleFaces.append(cube_faces[i])
    return visibleFaces

def renderResult(voxels, target_image, textures):
    """
    Renders the voxels into an image
    """
    for voxel in voxels:
        visible_faces = visibleFaces(voxel[0] + 0.5, position)

        for face, vface in zip(voxel[2], visible_faces):
            normal = cube_normals[cube_faces.tolist().index(vface.tolist())]
            dif_val = np.clip(np.dot(normal, lightDir), 0, 1)
            dif_val = ambient + (1-ambient) * dif_val
            col = voxel[1][:3] * dif_val * light_color
            col = np.clip(col, 0, 255).astype(np.uint8)

            cv.fillPoly(target_image, [face], col.tolist())


    return target_image

def matchTextures(voxels, textures):
    meanTextures = {}
    for tex in textures:
        meanTextures[tex] = np.mean(textures[tex][:,:,:3], axis=(0,1))


    matched = []
    for voxel in voxels:
        bestMatch = None
        bestMatchDiff = np.inf

        for tex in textures:
            diff = np.linalg.norm(meanTextures[tex] - voxel[1][:3])
            if diff < bestMatchDiff:
                bestMatch = tex
                bestMatchDiff = diff
        
        matched.append((voxel[0], bestMatch, voxel[2]))

    return matched

print("Loading textures...")
textures = loadTextures()
print("Loading target image...")
target_image = cv.imread(input_file, cv.IMREAD_UNCHANGED)

#add alpha channel if not present
if target_image.shape[2] == 3:
    target_image = cv.cvtColor(target_image, cv.COLOR_BGR2BGRA)

output = target_image.copy()

w, h = target_image.shape[:2]
aspectRatio = w/h

viewMatrix = lookat(position, lookingAt, up)
projectionMatrix = perspective(fov, aspectRatio, near, far)
viewProjectionMatrix = np.matmul(projectionMatrix, viewMatrix)

vertices = voxelsInFrustum(viewProjectionMatrix, viewMatrix, near, far, fov, aspectRatio)
vertices.sort(key=lambda x: x[2], reverse=False)

visible_mask = np.ones((w, h), dtype=np.float32)
voxels = []

for vertex in vertices:
    cube = cube_corners + vertex[0]
    projected_cube = np.zeros((len(cube), 2), dtype=np.int32)
    
    for i in range(len(cube)):
        projected_cube[i], _ = projectToScreen(cube[i], viewProjectionMatrix)

    visible_faces = visibleFaces(vertex[0] + 0.5, position)
    projected_faces = projected_cube[visible_faces]

    color = matchVoxel(target_image, projected_faces, visible_mask)

    if color is not None:
        voxels.append((vertex[0], color, projected_faces))


voxels.reverse()
renderResult(voxels, output, textures)
#voxels = matchTextures(voxels, textures)

#save voxels
with open(output_file + ".txt", "w") as f:
    for voxel in voxels:
        f.write(str(voxel[0][0]) + " " + str(voxel[0][1]) + " " + str(voxel[0][2]) + 
                " " + str(voxel[1][0]) + " " + str(voxel[1][1]) + " " + str(voxel[1][2]) + "\n")

output[:, :, 3] = (1-visible_mask) * 255
cv.imwrite("output.png", output)
