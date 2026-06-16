const builder = require("electron-builder");
const yaml = require("js-yaml");
const fs = require("fs-extra");
const path = require("path");
const config = yaml.load(fs.readFileSync("./electron-builder.yml"));
const Platform = builder.Platform;
const program = require("commander");

async function copyFiles() {
  const files = [
    "package.json",
    "loading.html",
    "settings.html",
    "prompt.html",
    "images",
    "locales",
    "src/renderer/desktop.css",
    "src/renderer/settings.js",
    "src/renderer/renderer.js",
    "node_modules"
  ];
  for (let file of files) {
    await fs.copy(file, path.join(__dirname, config.directories.app, file.replace("src/", "")));
  }
  return files;
}

// async function patchFiles() {
//   await fs.copy('patch/underscore-package.json', path.join(__dirname, "node_modules/nomnom/node_modules/underscore/package.json"));
//   return ['nomnom/*/underscore/package.json'];
// }

async function build() {
  const platform = (process.platform === "darwin") ? Platform.MAC : Platform.WINDOWS;
  const npmSrc = path.join(__dirname, 'dist', 'node_modules', 'npm');
  return await builder.build({
    targets: platform.createTarget(),
    config: {
      ...config,
      // afterPack runs after app files are staged but before the installer is
      // built. We copy npm with its full nested node_modules here so that
      // electron-builder's node_modules filtering cannot strip it.
      afterPack: async (context) => {
        const npmDest = path.join(context.appOutDir, 'resources', 'npm');
        await fs.copy(npmSrc, npmDest);
        console.log(`Copied npm to ${npmDest}`);
        // minipass-flush@1.0.6 uses `const { Minipass } = require('minipass')` (named export, v5+).
        // Its nested minipass@3.3.6 uses `module.exports = class` (v3 style), so Minipass is undefined.
        // Removing the nested copy lets it resolve to the top-level minipass@7.x which exports correctly.
        const nestedMinipass = path.join(npmDest, 'node_modules', 'minipass-flush', 'node_modules', 'minipass');
        await fs.remove(nestedMinipass);
        console.log(`Removed nested minipass@3.x from minipass-flush (incompatible export style)`);
      }
    }
  });
}

async function main() {
  program
    .option("-s --setup")
    .option("-b --build")
    .parse(process.argv);
  const opts = program.opts();
  const noopts = !(opts.setup || opts.build)
  try {
    if (noopts || opts.setup) {
      // const patched = await patchFiles();
      // console.log(`Patched ${patched}.`);
      const copied = await copyFiles();
      console.log(`Copy ${copied} to dist/*`);
    }
    if (noopts || opts.build) {
      const res = await build();
      console.log(res);
    }
  }catch(err) {
    console.error(err);
  }
}

main().then(() => {console.log(`Done.`)});
