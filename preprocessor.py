import os
import cv2 as cv
import numpy as np

folder_path = "blocks"
png_files = [file for file in os.listdir(folder_path) if file.endswith(".png")]

average_colors = []
for file in png_files:
    image_path = os.path.join(folder_path, file)
    image = cv.imread(image_path)
    pixels = np.asarray(image)

    total_r, total_g, total_b = 0, 0, 0
    count = 0

    for x in range(16):
        for y in range(16):
            r, g, b = pixels[x, y]
            total_r += r
            total_g += g
            total_b += b
            count += 1

    average_r = total_r // count
    average_g = total_g // count
    average_b = total_b // count

    name = file.split(".")[0]
    average_colors.append((name, average_r, average_g, average_b))

# write to file
with open("blocks.txt", "w") as file:
    for color in average_colors:
        name, b, g, r = color
        file.write(f"{name} {r} {g} {b}\n")