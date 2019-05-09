const builder = require("electron-builder");
const yaml = require("js-yaml");
const fs = require("fs-extra");
const path = require("path");
const config = yaml.safeLoad(fs.readFileSync("./electron-builder.yml"));
const Platform = builder.Platform;

// console.log(config);


(async () => {
  try {
    const files = [
      "loading.html",
      "settings.html",
      "package.json",
      "images",
      "locales",
    ];
    for (let file of files) {
      await fs.copy(file, path.join(__dirname, config.directories.app, file));
    }

    // await fs.copy("loading.html", path.join(__dirname, config.directories.app, "loading.html"));
    // await fs.copy("settings.html", path.join(__dirname, config.directories.app, "settings.html"));
    // await fs.copy("package.json", path.join(__dirname, config.directories.app, "package.json"));
    // await fs.copy("images", path.join(__dirname, config.directories.app, "images"));
    // await fs.copy("locales", path.join(__dirname, config.directories.app, "locales"));
    // process.exit(0);
    
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

