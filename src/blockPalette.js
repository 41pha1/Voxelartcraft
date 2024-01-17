import { updatePalette } from "./script.js";

const categories = ["column", "gravity", "randomTickAffected", "lightEmitting", "survival", "renewable", "grayscale", "high_variance"];

const blockSelectorDiv = document.querySelector(".blockList");
const blocks = readFile("./blockProperties.json")

function updateSelection()
{
    const categoryButtons = document.querySelectorAll(".categoryButton");
    var anyPositive = false;
    for (var i = 0; i < categoryButtons.length; i++) {
        if (categoryButtons[i].classList.contains("positive")) {
            anyPositive = true;
        }
    }

    const allBlocks = document.querySelectorAll(".blockSelectorCheckbox");
    for (var i = 0; i < allBlocks.length; i++) {
        allBlocks[i].checked = !anyPositive
    }

    // POSITIVE OR
    // for (var i = 0; i < categoryButtons.length; i++) {
    //     if (categoryButtons[i].classList.contains("positive")) {
    //         const category = categoryButtons[i].id.replace("Button", "");
    //         const blocks = document.querySelectorAll("." + category);

    //         for (var j = 0; j < blocks.length; j++) {
    //             blocks[j].checked = true;
    //         }
    //     }
    // }

    // POSTIVE AND
    for (var i = 0; i < allBlocks.length; i++) {
        var block = allBlocks[i];
        var allPositive = true;
        for (var j = 0; j < categoryButtons.length; j++) {
            if (categoryButtons[j].classList.contains("positive")) {
                const category = categoryButtons[j].id.replace("Button", "");
                if (!block.classList.contains(category)) {
                    allPositive = false;
                    break;
                }
            }
        }
        block.checked = allPositive;
    }


    for (var i = 0; i < categoryButtons.length; i++) {
        if (categoryButtons[i].classList.contains("negative")) {
            const category = categoryButtons[i].id.replace("Button", "");
            const blocks = document.querySelectorAll("." + category);

            for (var j = 0; j < blocks.length; j++) {
                blocks[j].checked = false;
            }
        }
    }
    updatePalette();
}

function selectoHTML(blockID, r, g, b){
    var title = blockID.replace(/_/g, " ");
    
    title = title.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });

    var classes = "blockSelectorCheckbox"

    for (var i = 0; i < categories.length; i++) {
        if (blocks[blockID][categories[i]] == "true")
            classes += " " + categories[i];
    }

    return `
    <div class="blockSelector">
        <input type="checkbox" id = "${blockID}" class="${classes}" checked>
        <label for="${blockID}" class="blockSelectorLabel">
            <label class = "rgb" style="display:none;"> ${r}, ${g}, ${b} </label>
            <image class="blockSelectorImage" src="./blocks/${blockID}.png" title="${title}"></image>
            <div class= "blockCounter" id = "${blockID}_counter" style="display:none;">
                x0
            </div>
        </label>
    </div>
    `;
}

function readFile(filePath) {
    var request = new XMLHttpRequest();
    request.open("GET", filePath, false);
    request.send(null);
    var returnValue = JSON.parse(request.responseText);
    return returnValue;
}

var paletteHTML = "";

//blocks is a dictionary

for (var block in blocks) {
    if (blocks[block]["transparent"] == "true")
        continue;

    const color = blocks[block]["color"];
    const r = Math.floor(color[0] * 255);
    const g = Math.floor(color[1] * 255);
    const b = Math.floor(color[2] * 255);
    paletteHTML += selectoHTML(block, r, g, b);
}
blockSelectorDiv.innerHTML += paletteHTML;

const onclick = (e) => {
    updatePalette();
}

blockSelectorDiv.addEventListener("click", onclick);

const paletteHeader = document.querySelector(".palette-header");
const categoriesDiv = document.createElement("div");
categoriesDiv.classList.add("categories");

for (var i = 0; i < categories.length; i++) {
    const categoryButton = document.createElement("button");
    categoryButton.innerHTML = categories[i];
    categoryButton.classList.add("categoryButton");
    categoryButton.classList.add("neutral");
    categoryButton.classList.add(categories[i]);
    categoryButton.id = categories[i] + "Button";
    categoryButton.addEventListener("click", (e) => {
        const categoryButton = e.target;


        if (categoryButton.classList.contains("neutral")) {
            categoryButton.classList.remove("neutral");
            categoryButton.classList.add("positive");
        }
        else if (categoryButton.classList.contains("positive")) {
            categoryButton.classList.remove("positive");
            categoryButton.classList.add("negative");
        }
        else {
            categoryButton.classList.remove("negative");
            categoryButton.classList.add("neutral");
        }
        updateSelection();
    });
    categoriesDiv.appendChild(categoryButton);
}

paletteHeader.insertBefore(categoriesDiv, paletteHeader.childNodes[2]);
