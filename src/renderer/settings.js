// @ts-nocheck
const electron = window.nodeRequire("electron");
const ipc = electron.ipcRenderer;
var session;

function initApp() {
  console.log("initApp");
  ipc.send("settings:loaded");
  var editor = ace.edit("node-input-blacklist");
  // editor.setTheme("ace/theme/tomorrow")
  session = editor.getSession();
  session.setMode('ace/mode/text')
  session.on('change', function () {
    $("#nodesexcludes").val(session.getValue());
  });
  $("#red-ui-tab-user-settings-nodered").click(function(){
    $(this).addClass("active");
    $("#user-settings-nodered").show();
    $("#red-ui-tab-user-settings-other").removeClass("active");
    $("#user-settings-other").hide();
    return false;
  });
  $("#red-ui-tab-user-settings-other").click(function(){
    $(this).addClass("active");
    $("#user-settings-nodered").hide();
    $("#red-ui-tab-user-settings-nodered").removeClass("active");
    $("#user-settings-other").show();
    return false;
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
  $("#label-openlastfile").text(_i18n.__("settings.openlastfile"));
  $("#label-httpnodeauth").text(_i18n.__("settings.httpnodeauth"));
  $("#label-httpnodeauthuser").text(_i18n.__("settings.httpnodeauthuser"));
  $("#label-httpnodeauthpass").text(_i18n.__("settings.httpnodeauthpass"));
  $("#label-listenport").text(_i18n.__("settings.listenport"));
  $("#listenport").attr("placeholder", _i18n.__("settings.listenportPlaceholder"));
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
  $("#httpnodeauthuser").val(settings.httpNodeAuth.user);
  $("#httpnodeauthpass").val(settings.httpNodeAuth.pass);
  $("#projects").prop("checked", settings.projectsEnabled);
  $("#hideonminimize").prop("checked", settings.hideOnMinimize);
  $("#autocheckupdate").prop("checked", settings.autoCheckUpdate);
  $("#allowprerelease").prop("checked", settings.allowPrerelease);
  $("#openlastfile").prop("checked", settings.openLastFile);
  $("#listenport").val(settings.listenPort);
  session.setValue($("#nodesexcludes").val(),-1);
})

$("#button-submit").on("click", function(event) {
  if (!$("#configForm").valid()) return true;
  const data = {
    userDir: $("#userdir").val(),
    credentialSecret: $("#credentialsecret").val(),
    nodesExcludes: $("#nodesexcludes").val(),
    projectsEnabled: $("#projects").prop("checked"),
    hideOnMinimize: $("#hideonminimize").prop("checked"),
    autoCheckUpdate: $("#autocheckupdate").prop("checked"),
    allowPrerelease: $("#allowprerelease").prop("checked"),
    openLastFile: $("#openlastfile").prop("checked"),
    httpNodeAuth: {
      user: $("#httpnodeauthuser").val(),
      pass: $("#httpnodeauthpass").val()
    },
    listenPort: $("#listenport").val()
  }
  ipc.send("settings:update", data);
  return false;
});

$("#button-cancel").on("click", function(event) {
  ipc.send("settings:cancel");
  return false;
});

$("#configForm").validate({
  rules: {
    credentialsecret: {
      required: true
    },
    listenport: {
      range: [0, 65535]
    },
    httpnodeauthuser: {
      maxlength: 64
    },
    httpnodeauthpass: {
      maxlength: 64
    }
  }
});
