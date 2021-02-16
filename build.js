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

    // const styles = [
    //   "jquery-validation/dist/jquery.validate.min.js"
    // ];
    // for (let file of styles) {
    //   const src = path.join(__dirname, "node_modules", file);
    //   const base = path.parse(file).base
    //   await fs.copy(src, path.join(__dirname, config.directories.app, base));
    // }

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

