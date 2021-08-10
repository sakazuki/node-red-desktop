const builder = require("electron-builder");
const yaml = require("js-yaml");
const fs = require("fs-extra");
const path = require("path");
const config = yaml.safeLoad(fs.readFileSync("./electron-builder.yml"));
const Platform = builder.Platform;
const program = require("commander");

program.option("-n --no-build").parse(process.argv);


(async () => {
  try {
    const files = [
      "loading.html",
      "settings.html",
      "package.json",
      "images",
      "locales",
      "src/renderer/desktop.css"
    ];
    for (let file of files) {
      await fs.copy(file, path.join(__dirname, config.directories.app, file.replace("src/", "")));
    }

    // issue#49 https://github.com/sakazuki/node-red-desktop/issues/49
    await fs.copy('patch/i18n.js', path.join(__dirname, config.directories.app, "node_modules/@node-red/util/lib/i18n.js"));

    if (!program.opts().build) return;
    
    const platform = (process.platform === "darwin") ? Platform.MAC : Platform.WINDOWS;
    const res = await builder.build({
      targets: platform.createTarget(),
      config
    });
    console.log(res);
  }catch(err) {
    console.error(err);
  }
})();

