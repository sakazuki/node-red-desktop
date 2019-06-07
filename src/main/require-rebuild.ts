// basedon require-rebuild
// refs: https://github.com/juliangruber/require-rebuild

import log from "./log";
import Module from "module";
import * as resolve from "resolve";
import * as path from "path";
// import rebuild from "@node-red-desktop/electron-rebuild";
import child_process from "child_process";

const mismatchRe = /was compiled against a different Node.js version using/;
const winRe = /A dynamic link library \(DLL\) initialization routine failed/;

let rebuilding = false;

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
      if (process.env.NRD_AUTO_REBUILD && process.env.NRD_AUTO_REBUILD.match(/false/i)) throw err;
      if (!mismatchRe.test(err.message) && !winRe.test(err.message)) throw err;
      if (rebuilding) {
        log.info(`Rebuilding..., Skip to rebuild ${request}`)
        return;
      }
      rebuilding = true;
      log.info(err)
      const resolved = resolve.sync(request, {
        basedir: path.dirname(parent.id),
        //@ts-ignore
        extenstions: [".js", ".json", ".node"]
      });

      const segs = resolved.split(path.sep);
      const modulePath = segs.slice(0, segs.indexOf("node_modules")).join(path.sep);

      log.info("Rebuilding %s...", modulePath);

      try {
        const rebuildCommand = path.join(__dirname, "../node_modules/@node-red-desktop/electron-rebuild/lib/src/cli.js");
        const ps = child_process.spawnSync("node", [
          rebuildCommand,
          `--version ${process.versions.electron}`,
          `--module-dir ${modulePath}`
        ], {
          cwd: modulePath,
          stdio: "inherit"
        });
        if (ps.error) throw ps.error;
        log.info("Rebuild Successful");
        rebuilding = false;
        return load.call(Module, request, parent);
        // rebuild({
        //   buildPath: modulePath,
        //   electronVersion: process.versions.electron
        // }).then(async () => {
        //   log.info("Rebuild Successful");
        //   rebuilding = false;
        //   return load.call(Module, request, parent);
        // }).catch(err => {
        //   log.error("Rebuild failed. Building modules didn't work!", err);
        //   rebuilding = false;
        //   throw err;
        // });
      } catch(err) {
        log.error(err);
        rebuilding = false;
        throw err;
      }
    }
  }
  return require;
}

export default patch;
