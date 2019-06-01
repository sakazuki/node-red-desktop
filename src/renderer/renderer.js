// @ts-nocheck

const electron = window.nodeRequire("electron");
const ipc = electron.ipcRenderer;

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
  $("#full-shade").show();
});

ipc.on("shade:hide", (event, message) => {
  $("#full-shade").hide();
});
