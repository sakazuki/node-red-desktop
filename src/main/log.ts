import log from "electron-log";
import fs from "fs";
import path from "path";

function archiveLog(file: string): void {
  var info = path.parse(file);
  try {
    const iso = new Date().toISOString().replace(/[-:]/g, "");
    fs.renameSync(file, path.join(info.dir, info.name + '-' +  iso + info.ext));
  } catch (e) {
    // @ts-ignore
    log.transports.console({
      data: ["Could not rotate log", e] ,
      date: new Date(),
      level: "warn"
    });
  }
}

log.transports.console.level = 'debug';
log.transports.file.level = 'info';
log.transports.file.archiveLog = archiveLog;
log.info(process.argv);

export default log;
