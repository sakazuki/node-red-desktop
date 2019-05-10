// @ts-nocheck
const electron = window.nodeRequire("electron");
const ipc = electron.ipcRenderer;

function initLoader() {
  console.log("initLoader");
}

function initApp() {
  console.log("initApp");
  ipc.send("settings:loaded");
}

function initLang() {
  window.document.title = _i18n.__("menu.settings");
  document.getElementById("label.userdir").innerText = _i18n.__("settings.userdir");
  document.getElementById("label.credentialsecret").innerText = _i18n.__("settings.credentialsecret");
  document.getElementById("label.nodesexcludes").innerText = _i18n.__("settings.nodesexcludes");
  document.getElementById("label.projects").innerText = _i18n.__("settings.projects");
  document.getElementById("button.submit").innerText = _i18n.__("settings.submit");
  document.getElementById("button.cancel").innerText = _i18n.__("settings.cancel");
}

document.addEventListener("dragover", event => event.preventDefault());
document.addEventListener("drop", event => event.preventDefault());

document.addEventListener("readystatechange", event => {
  if (event.target.readyState === "interactive") {
    initLoader();
  }
  else if (event.target.readyState === "complete") {
    initApp();
  }
});

ipc.on("settings:set", (event, settings) => {
  console.log("received", event, settings);
  _i18n.setLocale(settings.locale);
  document.getElementById("userdir").value = settings.userDir;
  document.getElementById("credentialsecret").value = settings.credentialSecret;
  document.getElementById("nodesexcludes").value = settings.nodesExcludes.join("\n");
  document.getElementById("projects").checked = settings.projectsEnabled;
  initLang();
})

document.getElementById("button.submit").addEventListener("click", (event) => {
  const data = {
    userDir: document.getElementById("userdir").value,
    credentailSecret: document.getElementById("credentialsecret").value,
    nodesExcludes: document.getElementById("nodesexcludes").value,
    projectsEnabled: document.getElementById("projects").checked
  }
  ipc.send("settings:update", data);
});

document.getElementById("button.cancel").addEventListener("click", (event) => {
  ipc.send("settings:cancel");
});
