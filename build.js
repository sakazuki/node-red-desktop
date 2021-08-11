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
    "images",
    "locales",
    "src/renderer/desktop.css"
  ];
  for (let file of files) {
    await fs.copy(file, path.join(__dirname, config.directories.app, file.replace("src/", "")));
  }
  return files;
}

async function patchFiles() {
  await fs.copy('patch/underscore-patch.js', path.join(__dirname, "node_modules/nomnom/node_modules/underscore/package.json"));
  // issue#49 https://github.com/sakazuki/node-red-desktop/issues/49
  await fs.copy('patch/i18n.js', path.join(__dirname, config.directories.app, "node_modules/@node-red/util/lib/i18n.js"));
  return
}

async function build() {
  const platform = (process.platform === "darwin") ? Platform.MAC : Platform.WINDOWS;
  return await builder.build({
    targets: platform.createTarget(),
    config
  });
}

async function main() {
  program
    .option("-s --setup")
    .option("-b --build")
    .parse(process.argv);
  const opts = program.opts();
  try {
    if (opts.setup) {
      const copied = await copyFiles();
      console.log(`Copy ${copied} to dist/*`);
    }
    if (opts.build) {
      //await patchFiles();
      //console.log(`Replaced @node-red/util/lib/i18n.js`);
      const res = await build();
      console.log(res);
    }
  }catch(err) {
    console.error(err);
  }
}

main().then(() => {console.log(`Done.`)});
