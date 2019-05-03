import storage from "electron-json-storage-sync";
import log from "./log";

type CONFIG = {
  rememberLastFile: boolean;
  recentFiles: Array<string>;
  windowBounds: any;
}

export class ConfigManager {
  private name: string;
  public data: CONFIG;
  constructor(name: string) {
    this.name = name;
    this.data = this.load();
  }

  public load(): CONFIG {
    const res = storage.get(this.name);
    return (res.status ? res.data : {}) as CONFIG;
  }

  public save() {
    const res = storage.set(this.name, this.data);
    if (res.status) {
      return true;
    } else {
      log.error(res.error);
      return false;
    }
  }
}