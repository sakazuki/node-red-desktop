import storage from "electron-json-storage-sync";
import log from "./log";

type CONFIG = {
  rememberLastFile: boolean;
  recentFiles: Array<string>;
  windowBounds: any;
  locale: string;
  userDir: string;
  credentialSecret: string;
  projectsEnabled: boolean;
  nodesExcludes: Array<string>;
  autoCheckUpdate: boolean;
  allowPrerelease: boolean;
  autoDownload: boolean;
  hideOnMinimize: boolean;
}

export class ConfigManager {
  private name: string;
  public data: CONFIG;
  constructor(name: string) {
    this.name = name;
    this.data = this.load();
    // log.info(">>>>config loaded", this.data);
  }

  public getName() { return this.name; }

  public load(): CONFIG {
    const res = storage.get(this.getName());
    return (res.status ? res.data : {}) as CONFIG;
  }

  public save() {
    const res = storage.set(this.getName(), this.data);
    // log.info(">>>>config saved", res);
    if (res.status) {
      return true;
    } else {
      log.error(res.error);
      return false;
    }
  }
}