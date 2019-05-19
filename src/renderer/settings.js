// @ts-nocheck
const electron = window.nodeRequire("electron");
const ipc = electron.ipcRenderer;

function initApp() {
  console.log("initApp");
  ipc.send("settings:loaded");
  $("#tabs li").on("click", function() {
    const tab = $(this).data("tab");
    $("#tabs li").removeClass("is-active");
    $(this).addClass("is-active");
    $("#tab-content div.container").removeClass("is-active");
    $("#tab-content div.container[data-content='" + tab + "']").addClass("is-active");
  });
}

function initLang() {
  window.document.title = _i18n.__("menu.settings");
  $("#label-userdir").text(_i18n.__("settings.userdir"));
  $("#label-credentialsecret").text(_i18n.__("settings.credentialsecret"));
  $("#label-nodesexcludes").text(_i18n.__("settings.nodesexcludes"));
  $("#label-projects").text(_i18n.__("settings.projects"));
  $("#button-submit").text(_i18n.__("settings.submit"));
  $("#button-cancel").text(_i18n.__("settings.cancel"));
  $("#label-hideonminimize").text(_i18n.__("settings.hideonminimize"));
  $("#label-autocheckupdate").text(_i18n.__("settings.autocheckupdate"));
  $("#label-allowprerelease").text(_i18n.__("settings.allowprerelease"));
}

$(document).on("dragover", event => event.preventDefault());
$(document).on("drop", event => event.preventDefault());

$(document).ready(function(){
  initApp();
});

ipc.on("settings:set", (event, settings) => {
  console.log("received", settings);
  _i18n.setLocale(settings.locale);
  initLang();
  $("#userdir").val(settings.userDir);
  $("#credentialsecret").val(settings.credentialSecret);
  $("#nodesexcludes").val(settings.nodesExcludes.join("\n"));
  $("#projects").prop("checked", settings.projectsEnabled);
  $("#hideonminimize").prop("checked", settings.hideOnMinimize);
  $("#autocheckupdate").prop("checked", settings.autoCheckUpdate);
  $("#allowprerelease").prop("checked", settings.allowPrerelease);
})

$("#button-submit").on("click", function(event) {
  const data = {
    userDir: $("#userdir").val(),
    credentialSecret: $("#credentialsecret").val(),
    nodesExcludes: $("#nodesexcludes").val(),
    projectsEnabled: $("#projects").prop("checked"),
    hideOnMinimize: $("#hideonminimize").prop("checked"),
    autoCheckUpdate: $("#autocheckupdate").prop("checked"),
    allowPrerelease: $("#allowprerelease").prop("checked")
  }
  ipc.send("settings:update", data);
});

$("#button-cancel").on("click", function(event) {
  ipc.send("settings:cancel");
});
