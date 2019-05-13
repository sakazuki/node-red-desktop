import storage from "electron-json-storage-sync";
import log from "./log";
import { app } from "electron";
import path from "path";
import os from "os";
import { DEFAULT_NODES_EXCLUDES } from "./node-red";

interface CONFIG {
  rememberLastFile: boolean;
  recentFiles: string[];
  windowBounds: Electron.Rectangle;
  locale: string;
  userDir: string;
  credentialSecret: string;
  projectsEnabled: boolean;
  nodesExcludes: string[];
  autoCheckUpdate: boolean;
  allowPrerelease: boolean;
  autoDownload: boolean;
  hideOnMinimize: boolean;
};

const DEFAULT_CONFIG: CONFIG = {
  rememberLastFile: true,
  recentFiles: [],
  windowBounds: {} as Electron.Rectangle,
  locale: app.getLocale(),
  userDir: path.join(os.homedir(), "." + app.getName()),
  credentialSecret: app.getName(),
  projectsEnabled: false,
  nodesExcludes: DEFAULT_NODES_EXCLUDES,
  autoCheckUpdate: true,
  allowPrerelease: false,
  autoDownload: false,
  hideOnMinimize: false
};

export class ConfigManager {
  private name: string;
  public data: CONFIG;
  constructor(name: string) {
    this.name = name;
    this.data = this.load();
    // log.info(">>>>config loaded", this.data);
  }

  public getName(): string {
    return this.name;
  }

  public load(): CONFIG {
    const res = storage.get(this.getName());
    return (res.status ? res.data : DEFAULT_CONFIG) as CONFIG;
  }

  public save(): boolean {
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
