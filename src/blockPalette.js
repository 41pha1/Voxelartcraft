const blockSelectorDiv = document.querySelector(".blockList");
const blockIDs = readFile("./blocks.txt").split("\n");

function selectoHTML(blockID) {
    var title = blockID.replace(/_/g, " ");
    
    title = title.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });

    return `
    <div class="blockSelector">
        <input type="checkbox" id = "${blockID}" class="blockSelectorCheckbox" checked>
        <label for="${blockID}" class="blockSelectorLabel">
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

blockIDs.forEach((blockID) => {
    paletteHTML += selectoHTML(blockID);
});

blockSelectorDiv.innerHTML += paletteHTML;



