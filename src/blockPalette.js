import { updatePalette } from "./script.js";

const blockSelectorDiv = document.querySelector(".blockList");
const blockIDs = readFile("./blocks.txt").split("\n");

function selectoHTML(blockID, r, g, b){
    var title = blockID.replace(/_/g, " ");
    
    title = title.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });

    return `
    <div class="blockSelector">
        <input type="checkbox" id = "${blockID}" class="blockSelectorCheckbox" checked>
        <label for="${blockID}" class="blockSelectorLabel">
            <label class = "rgb" style="display:none;"> ${r}, ${g}, ${b} </label>
            <image class="blockSelectorImage" src="./blocks/${blockID}.png" title="${title}"></image>
        </label>
    </div>
    `;
}

function readFile(filePath) {
    var request = new XMLHttpRequest();
    request.open("GET", filePath, false);
    request.send(null);
    var returnValue = request.responseText;
    return returnValue;
}

var paletteHTML = "";

blockIDs.forEach((entry) => {

    const entries = entry.split(" ");
    var blockID = entries[0];
    var r = entries[1];
    var g = entries[2];
    var b = entries[3];
    paletteHTML += selectoHTML(blockID, r, g, b);
});

blockSelectorDiv.innerHTML += paletteHTML;

const onclick = (e) => {
    updatePalette();
}

blockSelectorDiv.addEventListener("click", onclick);


