// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

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
