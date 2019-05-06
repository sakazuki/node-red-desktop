import express from "express";
import {IpFilter, IpDeniedError} from "express-ipfilter";
const RED =  require("node-red");
const Tokens = require("@node-red/editor-api/lib/auth/tokens");
import http from "http";
import { ipcMain, app } from "electron";
import path from "path";
import log from "./log";
import { AppStatus } from "./main";
import fs from "fs-extra";
const CustomStorage = require("./custom-storage");


const IP_ALLOWS = ['127.0.0.1'];
const HELP_WEB_URL = "https://frontops.exhands.org";
const SSL_SERVER_KEY = path.join(__dirname, "..", "server_key.pem");
const SSL_SERVER_CERT = path.join(__dirname, "..", "server_crt.pem");

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
    const config = {
      verbose: true,
      httpAdminRoot: this.adminPath,
      httpNodeRoot: this.uiPath,
      userDir: this.status.userDir,
      flowFile: this.status.currentFile,
      storageModule: CustomStorage, 
      //TODO: 
      credentialSecret: app.getName(),
      httpNodeCors: {
        origin: "*",
        methods: "GET,PUT,POST,DELETE"
      },
      functionGlobalContext: {
        // events: RED.events
      },
      editorTheme: {
        page: {
          title: app.getName(),
          favicon: path.join(__dirname, "..", "images", "favicon.ico"),
          scripts: path.join(__dirname, "..", "renderer/renderer.js")
        },
        header: {
          title: app.getName(),
          image: __dirname + "/images/frontops.png"
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
          // enabled: true
        }
      },
      nodesExcludes: [ '10-mqtt.js', '16-range.js', '31-tcpin.js', '32-udp.js', '36-rpi-gpio.js', '28-tail.js', '72-sentiment.js', '89-trigger.js', 'node-red-node-rbe' ],
      logging: {
        electron: {
          level: "debug",
          metrics: true,
          handler(settings: any){
            return function(msg: any) {
              var m = ({
                20: "error",
                30: "warn",
                40: "info",
                60: "verbose",
                50: "debug",
                // 60: "debug",
                98: "info",
                99: "info"
              } as any)[msg.level];
              if(m && msg.msg) (log as any)[m](msg.msg);
            }
          }
        }
      }
    };
    return config;
  }

  private setupServer() {
    this.app.use(this.adminPath, IpFilter(IP_ALLOWS, {
      mode: "allow",
      logLevel: "deny",
      detectIP(req: express.Request) {
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
    // const options = {
    //   key: fs.readFileSync(SSL_SERVER_KEY),
    //   cert: fs.readFileSync(SSL_SERVER_CERT)
    // }
    // return https.createServer(options, this.app);
    return http.createServer(this.app);
  }

  private async setupAuth() {
    //TODO: fix
    const token = await Tokens.create("sakazuki@gmail.com", "node-red-editor", "*");
    return token;
  }

  private revokeAuth(token: any) {
    return Tokens.revoke(token);
  }

  public getAdminUrl() {
    return `http://${this.listenIp}:${this.listenPort}${this.adminPath}`
  }

  public getHttpUrl() {
    return `http://${this.listenIp}:${this.listenPort}${this.uiPath}`
  }

  private setupRED() {
    RED.init(this.server, this.settings);
    this.app.use(this.settings.httpAdminRoot, RED.httpAdmin);
    this.app.use(this.settings.httpNodeRoot, RED.httpNode);
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

  public notify(data: any, timeout: number) {
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
    return `Node-RED v${RED.version()}`
  }

}