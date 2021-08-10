import express from "express";
import {IpFilter, IpDeniedError} from "express-ipfilter";
// must load before node-red
const runtime = require("@node-red/runtime");
const installer = require("@node-red/registry/lib/installer");
const Node = require("@node-red/runtime/lib/nodes/Node")
import newExec from "./node-red-runtime-exec";
import RED from "node-red";
import http from "http";
import { ipcMain, app, ipcRenderer } from "electron";
import path from "path";
import log from "./log";
import { AppStatus } from "./main";
import fs from "fs";
const CustomStorage = require("./custom-storage");
const registry = require("@node-red/registry");
import _ from "lodash";
import bcryptjs from "bcryptjs";
import basicAuth from "basic-auth";
import merge from "deepmerge";

const IP_ALLOWS = ["127.0.0.1"];
if (process.env.NRD_IP_ALLOWS) {
  IP_ALLOWS.push(...process.env.NRD_IP_ALLOWS.split(/,/))
}
const HELP_WEB_URL = "https://sakazuki.github.io/node-red-desktop/";
export const NPM_COMMAND = process.platform === 'win32' ? 'npm.cmd' : 'npm';

export const DEFAULT_NODES_EXCLUDES = [
  "10-mqtt.js",
  "16-range.js",
  "31-tcpin.js",
  "32-udp.js",
  // "36-rpi-gpio.js", // not exist in 1.0.0
  "89-trigger.js",
  // "node-red-node-tail",
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
    this.listenIp = process.env.NRD_LISTEN_IP || process.env.LISTEN_IP || "127.0.0.1";
    this.listenPort = this.defineListenPort();
    this.patchInstaller();
    this.patchRuntimeExec();
    this.setupRED();
  }

  private defineListenPort(): number {
    return parseInt(process.env.NRD_LISTEN_PORT || process.env.LISTEN_PORT || this.status.listenPort || String(Math.random() * 16383 + 49152))
  }

  public windowTitle() {
    const filePath = path.parse(this.status.currentFile);
    return `${filePath.base} - ${app.name}`;
  }

  private loadUserSettings(){
    const SETTINGS_FILE = "settings.js"
    if (!this.status.userDir) return {}
    if (!fs.existsSync(path.join(this.status.userDir, SETTINGS_FILE))) return {}
    try {
      return require(path.join(this.status.userDir, SETTINGS_FILE))
    } catch(err) {
      log.error(err)
      return {}  
    }
  }

  private setupSettings() {
    const _this = this;
    const userSettings = this.loadUserSettings();
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
      httpNodeAUth: undefined,
      functionGlobalContext: {
        get NGROK_URL(): string { return _this.status.ngrokUrl }
      },
      functionExternalModules: true,
      editorTheme: {
        page: {
          title: app.name,
          favicon: path.join(__dirname, "..", "images", "favicon.ico"),
          scripts: path.join(__dirname, "..", "renderer/renderer.js"),
          css: path.join(__dirname, "..", "renderer/desktop.css")
        },
        header: {
          title: app.name
        },
        palette: {
          editable: true
        },
        menu: { 
          "menu-item-help": {
            label: app.name,
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
    // @ts-ignore
    if (this.status.projectsEnabled) delete config.storageModule;
    if (this.status.httpNodeAuth.user.length > 0 && this.status.httpNodeAuth.pass.length) {
      //@ts-ignore
      config.httpNodeAuth = {
        user: this.status.httpNodeAuth.user,
        pass: bcryptjs.hashSync(this.status.httpNodeAuth.pass, 8)
      }
    }
    return merge(userSettings, config);
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

  // based on the code in node-red/red.js 
  private basicAuthMiddleware(user: string, pass: string) {
    let localCachedPassword: string;
    const checkPassword = function(p: string) {
      return bcryptjs.compareSync(p,pass);
    }

    const checkPasswordAndCache = function(p: string) {
      if (localCachedPassword === p) {
        return true;
      }
      var result = checkPassword(p);
      if (result) {
        localCachedPassword = p;
      }
      return result;
    }

    return function(req: express.Request, res: express.Response, next: express.NextFunction) {
      if (req.method === 'OPTIONS') {
        return next();
      }
      var requestUser = basicAuth(req);
      if (!requestUser || requestUser.name !== user || !checkPasswordAndCache(requestUser.pass)) {
        res.set('WWW-Authenticate', 'Basic realm="Authorization Required"');
        return res.sendStatus(401);
      }
      next();
    }
  }

  private setupDebugOut() {
    Node.prototype._send = Node.prototype.send
    const me = this
    Node.prototype.send = function(msg: any) {
      Node.prototype._send.call(this, msg)
      if (!me.status.debugOut) return
      const _data = {
        id: this.id,
        z: this.z,
        name: this.name,
        topic: msg.topic,
        msg: msg,
        _path: msg._path
      }
      const data = RED.runtime.util.encodeObject(_data);
      RED.runtime.events.emit("comms", {
        topic: "debug",
        data: data,
        retain: false
      })
    }
  }

  private setupRED() {
    log.debug(">>> settings", this.settings);
    RED.init(this.server, this.settings);
    this.setupDebugOut()
    this.app.use(this.settings.httpAdminRoot, RED.httpAdmin);
    if (this.settings.httpNodeAuth) {
      this.app.use(
        this.settings.httpNodeRoot,
        this.basicAuthMiddleware(
          this.settings.httpNodeAuth.user,
          this.settings.httpNodeAuth.pass
        )
      );
    }
    this.app.use(this.settings.httpNodeRoot, RED.httpNode);
  }

  private patchInstaller() {
    installer._checkPrereq = installer.checkPrereq;
    installer.checkPrereq = () => {
      return new Promise<void>(resolve => {
        resolve();
      })
    }
  }

  private patchRuntimeExec() {
    newExec.init(RED.runtime._, this.status);
    runtime._.nodes.installerEnabled = () => { return true };
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

  private async addModule(pkgname: string) {
    try {
      const info: {nodes: any} = await registry.addModule(pkgname);
      RED.runtime.events.emit("runtime-event", {
        id: "node/added",
        payload: info.nodes,
        retain: false
      });
    } catch (err) {
      if (err.code === "module_already_loaded") {
        this.error(err, `${pkgname} already loaded`);
        return;
      }
      if (err.code !== "MODULE_NOT_FOUND") throw err;
      this.success(`${pkgname} installed`);
    }
  }

  private success(message: string, timeout = 3000) {
    ipcMain.emit("dialog:show", "success", message, timeout);
  }

  private error(err: any, message: string) {
    log.info(err, message);
    ipcMain.emit("dialog:show", "error", JSON.stringify([message, err]));
  }

  public async execNpmLink(dir: string) {
    try {
      const pkginfo = this.loadPackageInfo(path.join(dir, "package.json"));
      if (!pkginfo.hasOwnProperty("node-red")) throw new Error("This module does not have a node-red property");
      // const res = await this.exec.run(NPM_COMMAND, ["link", dir], {cwd: this.status.userDir}, true);
      // if (res.code !== 0) throw res;
      const regist = await this.exec.run(NPM_COMMAND, ["link"], {cwd: dir}, true);
      if (regist.code !== 0) throw regist;
      const install = await this.exec.run(NPM_COMMAND, ["link", pkginfo.name], {cwd: this.status.userDir}, true);
      if (install.code !== 0) throw install;
      this.addModule(pkginfo.name);
    } catch(err) {
      this.error(err, "fail to add a node. check detail in log.");
    }
  }
  
  public async execNpmInstall(args: string) {
    try {
      const before = this.loadPackageInfo(path.join(this.status.userDir, "package.json"));
      const res = await this.exec.run(NPM_COMMAND, ["install", args], {cwd: this.status.userDir}, true);
      if (res.code !== 0) throw res;
      const after = this.loadPackageInfo(path.join(this.status.userDir, "package.json"));
      const newPkgs = _.difference(Object.keys(after.dependencies), Object.keys(before.dependencies));
      log.info("Installed packages", newPkgs)
      for (const pkgname of newPkgs) {
        const pkginfo = this.loadPackageInfo(path.join(this.status.userDir, "node_modules", pkgname, "package.json"));
        log.debug(pkginfo);
        if (pkginfo.hasOwnProperty("node-red")) this.addModule(pkgname);
      }
    } catch(err) {
      this.error(err, "fail to npm install. check detail in log.");
    };
  }

  public getNode(id: string) {
    return RED.nodes.getNode(id);
  }

  public info() {
    return `Node-RED version: ${RED.version()}
            Node.js  version: ${process.version}
            Electron version: ${process.versions.electron}`;
  }

}
