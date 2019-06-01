import express from "express";
import {IpFilter, IpDeniedError} from "express-ipfilter";
// must load before node-red
const runtime = require("@node-red/runtime");
const installer = require("@node-red/registry/lib/installer");
import newExec from "./node-red-runtime-exec";
import RED from "node-red";
import http from "http";
import { ipcMain, app, ipcRenderer } from "electron";
import path from "path";
import log from "./log";
import { AppStatus } from "./main";
import fs from "fs-extra";
import CustomStorage =  require("./custom-storage");
const registry = require("@node-red/registry");
import _ from "lodash";

const IP_ALLOWS = ["127.0.0.1"];
const HELP_WEB_URL = "https://sakazuki.github.io/node-red-desktop/";

export const DEFAULT_NODES_EXCLUDES = [
  "10-mqtt.js",
  "16-range.js",
  "31-tcpin.js",
  "32-udp.js",
  "36-rpi-gpio.js",
  "89-trigger.js",
  "node-red-node-tail",
  "node-red-node-sentiment",
  "node-red-node-rbe"
];

export class NodeREDApp {
  private app: express.Express;
  private server: http.Server;
  private settings: any;
  private adminPath: string;
  private uiPath: string;
  private listenIp: string;
  public listenPort: number;
  private status: AppStatus;

  constructor(status: AppStatus) {
    this.status = status;
    this.app = express();
    this.adminPath = "/admin";
    this.uiPath = "/";
    this.settings = this.setupSettings();
    this.server = this.setupServer();
    this.listenIp = process.env.LISTEN_IP || "127.0.0.1";
    this.listenPort = this.defineListenPort();
    this.patchInstaller();
    this.patchRuntimeExec();
    this.setupRED();
  }

  private defineListenPort(): number {
    return parseInt(process.env.LISTEN_PORT || String(Math.random() * 16383 + 49152))
  }

  public windowTitle() {
    const filePath = path.parse(this.status.currentFile);
    return `${filePath.base} - ${app.getName()}`;
  }

  private setupSettings() {
    const _this = this;
    const config = {
      verbose: true,
      httpAdminRoot: this.adminPath,
      httpNodeRoot: this.uiPath,
      userDir: this.status.userDir,
      flowFile: this.status.currentFile,
      storageModule: CustomStorage, 
      credentialSecret: this.status.credentialSecret,
      httpNodeCors: {
        origin: "*",
        methods: "GET,PUT,POST,DELETE"
      },
      functionGlobalContext: {
        get NGROK_URL(): string { return _this.status.ngrokUrl }
      },
      editorTheme: {
        page: {
          title: app.getName(),
          favicon: path.join(__dirname, "..", "images", "favicon.ico"),
          scripts: path.join(__dirname, "..", "renderer/renderer.js"),
          css: path.join(__dirname, "..", "renderer/desktop.css")
        },
        header: {
          title: app.getName()
        },
        palette: {
          editable: true
        },
        menu: { 
          "menu-item-help": {
            label: app.getName(),
            url: HELP_WEB_URL
          }
        },
        login: {
          image: path.join(__dirname, "images", "node-red-256.png")
        },
        projects: {
          enabled: this.status.projectsEnabled || false
        }
      },
      nodesExcludes: this.status.nodesExcludes || [],
      logging: {
        electron: {
          level: "debug",
          metrics: true,
          handler(){
            const electronLogLevel = function(noderedLevel: number): string {
              const levelMap: any = {
                10: "error",
                20: "error",
                30: "warn",
                40: "info",
                50: "debug",
                60: "verbose",
                98: "info",
                99: "info"
              };
              return levelMap[noderedLevel];
            };
            return function(msg: {level: number, msg?: {stack?: object}, type?: string}) {
              var m = electronLogLevel(msg.level);
              if(m && msg.msg) (log as any)[m](msg.msg);
            }
          }
        }
      }
    };
    if (this.status.projectsEnabled) delete config.storageModule;
    return config;
  }

  private setupServer() {
    this.app.use(this.adminPath, IpFilter(IP_ALLOWS, {
      mode: "allow",
      logLevel: "deny",
      detectIp(req: express.Request) {
        return req.headers["x-forwarded-for"] || IP_ALLOWS[0]
      }
    }));
    this.app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if(err instanceof IpDeniedError){
        res.status(401);
      } else {
        res.status(err.status || 500);
      }
      res.send({
        error: err.message
      });
    })
    return http.createServer(this.app);
  }

  public getAdminUrl() {
    return `http://${this.listenIp}:${this.listenPort}${this.adminPath}`
  }

  public getHttpUrl() {
    return `http://${this.listenIp}:${this.listenPort}${this.uiPath}`
  }

  private setupRED() {
    log.debug(">>> settings", this.settings);
    RED.init(this.server, this.settings);
    this.app.use(this.settings.httpAdminRoot, RED.httpAdmin);
    this.app.use(this.settings.httpNodeRoot, RED.httpNode);
  }

  private patchInstaller() {
    installer._checkPrereq = installer.checkPrereq;
    installer.checkPrereq = () => {
      return new Promise(resolve => {
        resolve();
      })
    }
  }

  private patchRuntimeExec() {
    newExec.init(RED.runtime._);
    runtime._.nodes.paletteEditorEnabled = () => { return true };
  }

  get exec() {
    return newExec;
  }

  public async startRED() {
    this.server.close();
    try {
      await RED.start();
      this.server.listen(this.listenPort, this.listenIp, () => {
        ipcMain.emit("browser:go", this.getAdminUrl());
      });
    } catch (err) {
      log.error(err);
    }
  }

  public async setFlowFileAndRestart(file: string) {
    if (!fs.existsSync(file)) {
      log.error(`File does not exist ${file}`);
      return;
    }
    await RED.nodes.stopFlows();
    ipcMain.emit("browser:loading");
    this.setFlowFile(file);
    await RED.nodes.loadFlows(true);
    ipcMain.emit("browser:go", this.getAdminUrl());
  }

  public setFlowFile(file: string) {
    this.status.currentFile = file;
    this.settings = this.setupSettings();
    this.settings.storageModule.init(this.settings, RED.runtime._);
    ipcMain.emit("browser:update-title");
  }

  private loadPackageInfo(file: string): any {
    const data = fs.readFileSync(file);
    return JSON.parse(data.toString());
  }

  public async execNpmLink(dir: string) {
    try {
      const pkginfo = this.loadPackageInfo(path.join(dir, "package.json"));
      await this.exec.run("npm", ["link", dir], {cwd: this.status.userDir}, true);
      const info: {nodes: any} = await registry.addModule(pkginfo.name);
      RED.runtime.events.emit("runtime-event", {
        id: "node/added",
        payload: info.nodes,
        retain: false
      })
    } catch(err) {
      log.info(err);
      this.notify({
        id: "node-add-fail",
        payload: {
          type: "error",
          text: `fail to add ${err}`
        },
        retain: false
      }, 3000);
    }
  }
  
  public async execNpmInstall(args: string) {
    try {
      const before = this.loadPackageInfo(path.join(this.status.userDir, "package.json"));
      await this.exec.run("npm", ["install", args], {cwd: this.status.userDir}, true);
      const after = this.loadPackageInfo(path.join(this.status.userDir, "package.json"));
      const newPkgs = _.difference(Object.keys(after.dependencies), Object.keys(before.dependencies));
      log.info("Installed packages", newPkgs)
      for (const pkgname of newPkgs) {
        const info: {nodes: any} = await registry.addModule(pkgname);
        RED.runtime.events.emit("runtime-event", {
          id: "node/added",
          payload: info.nodes,
          retain: false
        });
      }
    } catch(err) {
      log.info(err);
      this.notify({
        id: "node-add-fail",
        payload: {
          type: "error",
          text: `fail to npm install. ${err}`
        },
        retain: false
      }, 3000);
    };
  }

  public async rebuildForElectron() {
    try {
      const rebuild = require(path.join(this.status.userDir, "node_modules", "electron-rebuild"));
      await rebuild.rebuild({
        buildPath: this.status.userDir,
        electronVersion: process.versions.electron
      });
    } catch(err) {
      log.info(err);
      this.notify({
        id: "rebuild-fail",
        payload: {
          type: "error",
          text: `fail to rebuild. ${err}`
        },
        retain: false
      }, 3000);
    }
  }

  public notify(data: {id: string, payload: {type: string, text: string}, retain: boolean}, timeout: number) {
    RED.runtime.events.emit("runtime-event", data);
    function closeNotify() {
      RED.runtime.events.emit("runtime-event", {
        id: data.id,
        payload: {},
        retain: false
      });
    }
    setTimeout(closeNotify, timeout);
  }

  public info() {
    return `Node-RED version: ${RED.version()}
            Node.js  version: ${process.version}`;
  }

}
