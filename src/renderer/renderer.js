// @ts-nocheck

const electron = window.nodeRequire("electron");
const ipc = electron.ipcRenderer;

$("#full-shade").after('<div id="nrd-shade" class="hide"></div>');

RED.events.on("nodes:change",function(state) {
  ipc.send("nodes:change", state);
});

ipc.on("force:reload", function() {
  window.onbeforeunload = null;
  $("#btn-deploy").addClass("disabled");
})

ipc.on("editor:deploy",  (event, message) => {
  $("#btn-deploy").click();
});

ipc.on("editor:start", (event, message) => {
  var observer  = new MutationObserver((mutationRecords, observer) => {
    var target = $("#red-ui-tab-debug a");
    if (target.length){
      observer.disconnect();
      target.click();
      ipc.send("editor:started");
    }
  });
  observer.observe(document, {childList:true, subtree: true});
});

ipc.on("shade:show", (event, message) => {
  $("#nrd-shade").show();
});

ipc.on("shade:start", (event, message) => {
  $("#nrd-shade").css("background-image", "url(red/images/spin.svg)");
});

ipc.on("shade:end", (event, message) => {
  $("#nrd-shade").css("background-image", "none");
});

ipc.on("shade:hide", (event, message) => {
  $("#nrd-shade").css("background-image", "none");
  $("#nrd-shade").hide();
});

ipc.on("red:notify", (event, type, message, timeout) => {
  var options = {
    type: type,
    modal: true,
    fixed: false,
    timeout: timeout
  };
  if (!timeout) {
    Object.assign(options, {
      fixed: true,
      buttons: [
        {
          text: RED._("common.label.close"),
          click: function() {
            notification.close();
          }
        }
      ]
    });
  }
  var notification = RED.notify(message, options);
});
