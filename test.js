var settings = document.querySelector(".settings");
var aspmedia = window.matchMedia("(max-aspect-ratio: 4/3)");

function aspectmedia(e) {
  var btn = document.querySelector("#setting-button");
  if (e.matches) {
    btn.textContent = "Settings";
  } else {
    btn.textContent = "Close";
  }
}
aspmedia.addListener(aspectmedia);
aspectmedia(aspmedia);

function toggle_settings() {
  var settings = document.querySelector(".settings");
  var body = document.querySelector(".body");
  var btn = document.querySelector("#setting-button");

  if (btn.textContent == "Close") {
    settings.style.display = "none";
    btn.textContent = "Settings";
  } else {
    document.querySelector("body");
    settings.style.display = "block";
    btn.textContent = "Close";
  }
}
