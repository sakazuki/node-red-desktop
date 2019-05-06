import log from "electron-log";

log.transports.console.level = 'info';
// log.transports.file.level = "info";
log.transports.file.level = 'debug';
log.transports.file.format = '{y}-{m}-{d} {h}:{i}:{s}:{ms} [{level}] {text}'
log.info(process.argv);

export default log;
