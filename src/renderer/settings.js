// @ts-nocheck
var session;

function initApp() {
  console.log("initApp");
  window.NRDApi.sendSettingsLoaded();
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
  window.document.title = window.NRDApi.t("menu.settings");
  $("#label-userdir").text(window.NRDApi.t("settings.userdir"));
  $("#label-credentialsecret").text(window.NRDApi.t("settings.credentialsecret"));
  $("#label-nodesexcludes").text(window.NRDApi.t("settings.nodesexcludes"));
  $("#label-projects").text(window.NRDApi.t("settings.projects"));
  $("#button-submit").text(window.NRDApi.t("settings.submit"));
  $("#button-cancel").text(window.NRDApi.t("settings.cancel"));
  $("#label-hideonminimize").text(window.NRDApi.t("settings.hideonminimize"));
  $("#label-autocheckupdate").text(window.NRDApi.t("settings.autocheckupdate"));
  $("#label-allowprerelease").text(window.NRDApi.t("settings.allowprerelease"));
  $("#label-openlastfile").text(window.NRDApi.t("settings.openlastfile"));
  $("#label-httpnodeauth").text(window.NRDApi.t("settings.httpnodeauth"));
  $("#label-httpnodeauthuser").text(window.NRDApi.t("settings.httpnodeauthuser"));
  $("#label-httpnodeauthpass").text(window.NRDApi.t("settings.httpnodeauthpass"));
  $("#label-listenport").text(window.NRDApi.t("settings.listenport"));
  $("#listenport").attr("placeholder", window.NRDApi.t("settings.listenportPlaceholder"));
}

$(document).on("dragover", event => event.preventDefault());
$(document).on("drop", event => event.preventDefault());

$(document).ready(function(){
  initApp();
});

window.NRDApi.onSettingsSet((event, settings) => {
  console.log("received", settings);
  window.NRDApi.setLocale(settings.locale);
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
  window.NRDApi.sendSettingsUpdate(data);
});

$("#button-cancel").on("click", function(event) {
  window.NRDApi.sendSettingsCancel();
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
