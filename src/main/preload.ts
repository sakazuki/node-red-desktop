import _i18n from "./i18n";

interface Window {
  _i18n: any;
  nodeRequire: NodeRequire;
  require: any;
  exports: any;
  module: any;
}

declare let window: Window;

if(typeof(require) === "function"){
  window._i18n = _i18n;
  window.nodeRequire = require;
  delete window.require;
  delete window.exports;
  delete window.module;
}