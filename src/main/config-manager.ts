import storage from "electron-json-storage-sync";
import log from "./log";
import { app } from "electron";
import path from "path";
import os from "os";
import { DEFAULT_NODES_EXCLUDES } from "./node-red";

interface CONFIG {
  openLastFile: boolean;
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
  httpNodeAuth: {user: string, pass: string};
  listenPort: string;
  debugOut: boolean;
};

const DEFAULT_CONFIG: CONFIG = {
  openLastFile: true,
  recentFiles: [],
  windowBounds: {} as Electron.Rectangle,
  locale: app.getLocale(),
  userDir: path.join(os.homedir(), "." + app.name),
  credentialSecret: app.name,
  projectsEnabled: false,
  nodesExcludes: DEFAULT_NODES_EXCLUDES,
  autoCheckUpdate: true,
  allowPrerelease: false,
  autoDownload: false,
  hideOnMinimize: false,
  httpNodeAuth: {user: "", pass: ""},
  listenPort: "",
  debugOut: false
};

export class ConfigManager {
  private name: string;
  public data: CONFIG;
  constructor(name: string) {
    this.name = name;
    this.data = this.load();
    log.debug(">>> config loaded", this.data);
  }

  public getName(): string {
    return this.name;
  }

  private migration(config: any): CONFIG {
    //v0.8.9
    if (!config.hasOwnProperty("openLastFile")) config.openLastFile = DEFAULT_CONFIG.openLastFile;
    if (!config.hasOwnProperty("httpNodeAuth")) config.httpNodeAuth = DEFAULT_CONFIG.httpNodeAuth;
    return config;
  }

  public load(): CONFIG {
    const res = storage.get(this.getName());
    let config;
    if (res.status) {
      config = this.migration(res.data);
    } else {
      config = DEFAULT_CONFIG;
    }
    return config
  }

  public save(): boolean {
    const res = storage.set(this.getName(), this.data);
    log.debug(">>> config saved", res);
    if (res.status) {
      return true;
    } else {
      log.error(res.error);
      return false;
    }
  }
}
