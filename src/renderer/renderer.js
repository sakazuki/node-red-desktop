// @ts-nocheck

$(document).ready(function(){
  $("#red-ui-full-shade").after('<div id="nrd-shade" class="hide"></div>');

  RED.events.on("nodes:change",function(state) {
    window.NRDApi.sendNodesChange(state);
  });

  RED.events.on("view:selection-changed", function(selection) {
    window.NRDApi.sendViewSelectionChanged(selection);
  })
});

window.NRDApi.onForceReload(function() {
  window.onbeforeunload = null;
  $("#red-ui-header-button-deploy").addClass("disabled");
})

window.NRDApi.onEditorDeploy((event, message) => {
  $("#red-ui-header-button-deploy").click();
});

window.NRDApi.onEditorStart((event, message) => {
  var observer  = new MutationObserver((mutationRecords, observer) => {
    var target = $("#red-ui-tab-debug-link-button");
    if (target.length){
      observer.disconnect();
      target.click();
      window.NRDApi.sendEditorStarted();
    }
  });
  observer.observe(document, {childList:true, subtree: true});
});

window.NRDApi.onShadeShow((event, message) => {
  $("#nrd-shade").show();
});

window.NRDApi.onShadeStart((event, message) => {
  $("#nrd-shade").css("background-image", "url(red/images/spin.svg)");
});

window.NRDApi.onShadeEnd((event, message) => {
  $("#nrd-shade").css("background-image", "none");
});

window.NRDApi.onShadeHide((event, message) => {
  $("#nrd-shade").css("background-image", "none");
  $("#nrd-shade").hide();
});

window.NRDApi.onRedNotify((event, type, message, timeout) => {
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
