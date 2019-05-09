const electron = window.nodeRequire("electron");
const ipc = electron.ipcRenderer;

function initLoader() {
  console.log("initLoader");
}

function initApp() {
  console.log("initApp");
  ipc.send("settings:loaded");
}

document.addEventListener('readystatechange', event => {
  if (event.target.readyState === 'interactive') {
    initLoader();
  }
  else if (event.target.readyState === 'complete') {
    initApp();
  }
});

ipc.on("settings:update", (event, settings) => {
  console.log("received", event, settings);
})

document.getElementById("submit").addEventListener("click", (event) => {
  window.alert("submited");
});

document.getElementById("cancel").addEventListener("click", (event) => {
  window.alert("canceled");
});
