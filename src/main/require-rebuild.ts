// basedon require-rebuild
// refs: https://github.com/juliangruber/require-rebuild

import log from "./log";
import Module from "module";
import { sync } from "resolve";
import { dirname, sep } from "path";
import rebuild from "@node-red-desktop/electron-rebuild";
import fs from "fs-extra";
import path from "path";

const mismatchRe = /was compiled against a different Node.js version using/;
const winRe = /A dynamic link library \(DLL\) initialization routine failed/;

function patch() {
  //@ts-ignore
  const load = Module._load;
  //@ts-ignore
  Module._load = function(request: string, parent: any) {
    let ret;
    try {
      ret = load.call(Module, request, parent);
      return ret;
    } catch (err) {
      if (!mismatchRe.test(err.message) && !winRe.test(err.message)) throw err;
      console.info(err)
      const resolved = sync(request, {
        basedir: dirname(parent.id),
        //@ts-ignore
        extenstions: [".js", ".json", ".node"]
      });

      const segs = resolved.split(sep);
      let modulePath = "";
      for (let i = segs.indexOf("node_modules") + 2; i < segs.length - 1; i++) {
        const pkginfo = path.join(...segs.slice(0, i));
        if (
          fs.existsSync(path.join(pkginfo, "package.json"))
          && fs.existsSync(path.join(pkginfo, "node_modules"))
        ) {
          modulePath = pkginfo;
          break;
        }
      }
      if (modulePath === "")
        modulePath = segs.slice(0, segs.indexOf("node_modules")).join(sep);

      log.info("Recompiling %s...", modulePath);
      try {
        rebuild({
          buildPath: modulePath,
          electronVersion: process.versions.electron
        }).then(async () => {
          log.info("Rebuild Successful");
          // await new Promise(r => setTimeout(r, 1000));
          return load.call(Module, request, parent);
        }).catch(err => {
          log.error("Rebuild failed. Building modules didn't work!");
          log.error(err);
          throw err;
        });
      } catch(err) {
        log.error(err);
        throw err;
      }
    }
  }
  return require;
}

export default patch;
