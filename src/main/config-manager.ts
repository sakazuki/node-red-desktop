import Store from "electron-store";
import log from "./log";
import { app } from "electron";
import path from "path";
import os from "os";
import fs from "fs";
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
  ngrokAuthtoken: string;
}

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
  debugOut: false,
  ngrokAuthtoken: ""
};

export class ConfigManager {
  private name: string;
  public data: CONFIG;
  private store: Store<CONFIG>;

  constructor(name: string) {
    this.name = name;
    this.store = new Store<CONFIG>({ name, defaults: DEFAULT_CONFIG });
    this.migrateLegacy();
    this.data = this.load();
    log.debug(">>> config loaded", this.data);
  }

  public getName(): string {
    return this.name;
  }

  private migrateLegacy(): void {
    const legacyPath = path.join(app.getPath("userData"), "storage", `${this.name}.json`);
    if (!fs.existsSync(legacyPath)) return;
    try {
      const raw = fs.readFileSync(legacyPath, "utf-8");
      const data = JSON.parse(raw) as Partial<CONFIG>;
      const keys = Object.keys(DEFAULT_CONFIG) as (keyof CONFIG)[];
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.store.set(key, data[key] as any);
        }
      }
      fs.unlinkSync(legacyPath);
      log.info("[config] Legacy storage migrated and deleted:", legacyPath);
    } catch (err) {
      log.error("[config] Failed to migrate legacy storage:", err);
    }
  }

  public load(): CONFIG {
    return this.store.store;
  }

  public save(): boolean {
    try {
      this.store.store = this.data;
      log.debug(">>> config saved");
      return true;
    } catch (err) {
      log.error(err);
      return false;
    }
  }
}
