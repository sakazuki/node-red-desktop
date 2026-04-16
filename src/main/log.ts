import log from "electron-log";
import fs from "fs";
import path from "path";

function archiveLog(file: log.LogFile): void {
  const oldPath = file.toString();
  const info = path.parse(oldPath);
  try {
    const iso = new Date().toISOString().replace(/[-:]/g, "");
    fs.renameSync(oldPath, path.join(info.dir, info.name + '-' +  iso + info.ext));
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
//@ts-ignore
log.transports.file.archiveLog = archiveLog;
log.info(process.argv);

export default log;
