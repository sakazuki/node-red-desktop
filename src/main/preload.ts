import _i18n from "./i18n";

if(typeof(require) === "function"){
  (window as any)._i18n = _i18n;
  (window as any).nodeRequire = require;
  delete (window as any).require;
  delete (window as any).exports;
  delete (window as any).module;
}