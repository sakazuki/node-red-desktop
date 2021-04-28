import patchRequire from "./require-rebuild";
patchRequire();
import {
  app,
  App,
  BrowserWindowConstructorOptions,
  ipcMain,
  MenuItem,
  BrowserWindow,
  dialog,
  shell,
  Notification
} from "electron";
import { CustomBrowserWindow } from "./browser-window";
import { AppMenu } from "./menu";
import path from "path";
import { CustomAutoUpdater } from "./auto-update";
import i18n from "./i18n";
import urlparse from "url";
import { FileHistory } from "./file-history";
import { FileManager } from "./file-manager";
import { ConfigManager } from "./config-manager";
import { CustomTray } from "./tray";
import ngrok from "ngrok";
import { NodeREDApp, NPM_COMMAND } from "./node-red";
import log from "./log";
import fs from "fs-extra";
import { pathToFileURL } from "url";
import prompt from "electron-prompt";
import semver from "semver";
// import rebuild from "@node-red-desktop/electron-rebuild";
import nodegen from "node-red-nodegen";
import "./debug";

process.env.NODE_ENV = "production";
const macOS = process.platform === "darwin";

const FILE_HISTORY_SIZE = 10;
const HELP_NODERED_URL = "https://nodered.org/";
const HELP_NODERED_DESKTOP_URL = "https://sakazuki.github.io/node-red-desktop/";
const HELP_AUTHOR_URL = "https://node-red.exhands.org/";
const NGROK_INSPECT_URL = "http://localhost:4040";

export interface AppStatus {
  editorEnabled: boolean;
  ngrokUrl: string;
  ngrokStarted: boolean;
  modified: boolean;
  newfileChanged: boolean;
  locale: string;
  userDir: string;
  credentialSecret: string;
  currentFile: string;
  projectsEnabled: boolean;
  nodesExcludes: string[];
  autoCheckUpdate: boolean;
  allowPrerelease: boolean;
  autoDownload: boolean;
  hideOnMinimize: boolean;
  openLastFile: boolean;
  nodeCommandEnabled: boolean;
  npmCommandEnabled: boolean;
  httpNodeAuth: {user: string, pass: string};
  selection: {nodes: any[]};
  listenPort: string;
  debugOut: boolean;
}

type UserSettings = {
  userDir: string;
  credentialSecret: string;
  projectsEnabled: boolean;
  nodesExcludes: string;
  autoCheckUpdate: boolean;
  allowPrerelease: boolean;
  autoDownload: boolean;
  hideOnMinimize: boolean;
  openLastFile: boolean;
  httpNodeAuth: {user: string, pass: string};
  listenPort: string;
  debugOut: boolean;
}

class BaseApplication {
  private mainWindow: CustomBrowserWindow | null = null;
  private customAutoUpdater: CustomAutoUpdater | null = null;
  private appMenu: AppMenu | null = null;
  private tray: CustomTray | null = null;
  private app: App;
  private loadingURL: string = pathToFileURL(
    path.join(__dirname, "..", "loading.html")
  ).href;
  private settingsURL: string = pathToFileURL(
    path.join(__dirname, "..", "settings.html")
  ).href;
  private config: ConfigManager;
  private fileManager: FileManager;
  private fileHistory: FileHistory;
  private status: AppStatus;
  private red: NodeREDApp;

  constructor(app: App) {
    this.app = app;
    this.app.on("ready", this.onReady.bind(this));
    this.app.on("activate", this.onActivated.bind(this));
    this.app.on("window-all-closed", this.onWindowAllClosed.bind(this));
    this.config = new ConfigManager(app.name);
    this.fileManager = new FileManager(this.config);
    this.fileHistory = new FileHistory(FILE_HISTORY_SIZE, ipcMain);
    this.status = {
      editorEnabled: false,
      ngrokUrl: "",
      ngrokStarted: false,
      modified: false,
      newfileChanged: false,
      locale: this.config.data.locale,
      userDir: this.config.data.userDir,
      credentialSecret: this.config.data.credentialSecret,
      currentFile: this.getStartFlow(),
      projectsEnabled: this.config.data.projectsEnabled,
      nodesExcludes: this.config.data.nodesExcludes,
      autoCheckUpdate: this.config.data.autoCheckUpdate,
      allowPrerelease: this.config.data.allowPrerelease,
      autoDownload: this.config.data.autoDownload,
      hideOnMinimize: this.config.data.hideOnMinimize,
      openLastFile: this.config.data.openLastFile,
      nodeCommandEnabled: false,
      npmCommandEnabled: false,
      httpNodeAuth: this.config.data.httpNodeAuth,
      selection: {nodes: []},
      listenPort: this.config.data.listenPort,
      debugOut: this.config.data.debugOut
    };
    this.appMenu = new AppMenu(this.status, this.fileHistory);
    this.red = new NodeREDApp(this.status);
    ipcMain.on("browser:focus", this.setTitle.bind(this));
    ipcMain.on("browser:show", () => this.getBrowserWindow().show());
    ipcMain.on("browser:hide", () => this.getBrowserWindow().hide());
    ipcMain.on("browser:minimize", (event: Electron.Event) =>
      this.onMinimize(event)
    );
    ipcMain.on("browser:before-close", (event: Electron.Event) => 
      this.onBeforeClose(event)
    );
    ipcMain.on("browser:closed", this.onClosed.bind(this));
    ipcMain.on("browser:restart", this.onRestart.bind(this));
    ipcMain.on("browser:relaunch", this.onRelaunch.bind(this));
    // @ts-ignore
    ipcMain.on("browser:message", (text: string) => this.onMessage(text));
    ipcMain.on("browser:loading", this.onLoading.bind(this));
    // @ts-ignore
    ipcMain.on("browser:go", (url: string) => this.go(url));
    ipcMain.on("browser:update-title", this.setTitle.bind(this));
    // @ts-ignore
    ipcMain.on("browser:progress", (progress: number) => this.setProgress(progress));
    ipcMain.on("history:update", this.updateMenu.bind(this));
    ipcMain.on("menu:update", this.updateMenu.bind(this));
    // @ts-ignore
    ipcMain.on("window:new", (url: string) => this.onNewWindow(url));
    ipcMain.on("auth:signin", (event: Electron.Event, args: any) =>
      this.onSignIn(event, args)
    );
    ipcMain.on("auth:signedin", (event: Electron.Event, args: any) =>
      this.onSignedIn(event, args)
    );
    ipcMain.on("editor:started", (event: Electron.Event, args: any) =>
      this.onEditorStarted(event, args)
    );
    ipcMain.on("nodes:change", (event: Electron.Event, args: {dirty: boolean}) =>
      this.onNodesChange(event, args)
    );
    ipcMain.on("view:selection-changed",(event: Electron.Event, selection: {nodes: any[]}) =>
      this.onSelectionChanged(event, selection)
    )
    ipcMain.on("file:new", this.onFileNew.bind(this));
    // @ts-ignore
    ipcMain.on("file:open", this.onFileOpen.bind(this));
    ipcMain.on("file:clear-recent", this.onFileClearHistory.bind(this));
    ipcMain.on("file:save", this.onFileSave.bind(this));
    ipcMain.on("file:save-as", this.onFileSaveAs.bind(this));
    ipcMain.on("file:open-userdir", this.onUserdirOpen.bind(this));
    ipcMain.on("file:open-logfile", this.onLogfileOpen.bind(this));
    ipcMain.on("settings", this.onSettings.bind(this));
    ipcMain.on("endpoint:local", this.onEndpointLocal.bind(this));
    ipcMain.on("endpoint:local-admin", this.onEndpointLocalAdmin.bind(this));
    ipcMain.on("endpoint:public", this.onEndpointPublic.bind(this));
    ipcMain.on("ngrok:connect", this.onNgrokConnect.bind(this));
    ipcMain.on("ngrok:disconnect", this.onNgrokDisconnect.bind(this));
    ipcMain.on("ngrok:inspect", this.onNgrokInspect.bind(this));
    // @ts-ignore
    ipcMain.on("view:reload", (item: MenuItem, focusedWindow: BrowserWindow) =>
      this.onViewReload(item, focusedWindow)
    );
    ipcMain.on(
      "view:set-locale",
      // @ts-ignore
      (item: MenuItem, focusedWindow: BrowserWindow) =>
        this.onSetLocale(item, focusedWindow)
    );
    ipcMain.on("help:node-red", () => {
      this.onHelpWeb(HELP_NODERED_URL);
    });
    ipcMain.on("help:node-red-desktop", () => {
      this.onHelpWeb(HELP_NODERED_DESKTOP_URL);
    });
    ipcMain.on("help:author", () => {
      this.onHelpWeb(HELP_AUTHOR_URL);
    });
    ipcMain.on("help:check-updates", this.onHelpCheckUpdates.bind(this));
    ipcMain.on("help:version", this.onHelpVersion.bind(this));
    // @ts-ignore
    ipcMain.on("dev:tools", (item: MenuItem, focusedWindow: BrowserWindow) =>
      this.onToggleDevTools(item, focusedWindow)
    );
    ipcMain.on("settings:loaded", this.onSettingsLoaded.bind(this));
    ipcMain.on("settings:update", (event: Electron.Event, args: UserSettings) =>
      this.onSettingsSubmit(event, args)
    );
    ipcMain.on("settings:cancel", this.onSettingsCancel.bind(this));
    ipcMain.on("node:addLocal", this.onNodeAddLocal.bind(this));
    ipcMain.on("node:addRemote", this.onNodeAddRemote.bind(this));
    // ipcMain.on("node:rebuild", this.onNodeRebuild.bind(this));
    ipcMain.on("node:nodegen", this.onNodeGenerator.bind(this));
    // @ts-ignore
    ipcMain.on("dialog:show", (type: "success" | "error" | "info", message: string, timeout?: number) =>
      this.showRedNotify(type, message, timeout)
    );
    ipcMain.on("ext:debugOut", this.onDebugOut.bind(this))
  }

  private create() {
    const options: BrowserWindowConstructorOptions = {
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        worldSafeExecuteJavaScript: true,
        preload: path.join(__dirname, "preload.js"),
        defaultFontFamily: {
          standard: "Meiryo UI",
          serif: "MS PMincho",
          sansSerif: "Meiryo UI",
          monospace: "MS Gothic"
        }
      },
      title: app.name,
      fullscreenable: true,
      width: 1280,
      height: 960,
      minWidth: 500,
      minHeight: 200,
      acceptFirstMouse: true,
      titleBarStyle: "hidden",
      icon: path.join(__dirname, "..", "images", "favicon.ico")
    };
    const savedOption = this.config.data.windowBounds || {};
    Object.assign(options, savedOption);
    this.mainWindow = new CustomBrowserWindow(options, this.loadingURL);
  }

  private getStartFlow(): string {
    const firstArg = app.isPackaged ? 1 : 2;
    const args = process.argv[firstArg];
    if (args && fs.existsSync(args)) return args;
    if (this.config.data.openLastFile) {
      const lastFile = this.config.data.recentFiles[0];
      if (fs.existsSync(lastFile)) return lastFile;
    }
    return this.fileManager.createTmp();
  }

  private onReady() {
    try {
      i18n.setLocale(this.config.data.locale);
    } catch (err) {
      log.error(err);
    }
    this.status.locale = i18n.getLocale();
    this.create();
    this.fileHistory.load(this.config.data.recentFiles);
    this.customAutoUpdater = new CustomAutoUpdater(
      this.getBrowserWindow(),
      this.status
    );
    this.tray = new CustomTray(this.red);
    this.red.startRED();
  }

  private onActivated() {
    if (this.mainWindow === null) {
      this.create();
      this.go(this.red.getAdminUrl());
    }
  }

  private onWindowAllClosed() {
    if (!macOS) this.app.quit();
  }

  private saveConfig() {
    this.config.data.recentFiles = this.fileHistory.history;
    this.config.data.windowBounds = this.getBrowserWindow().getBounds();
    this.config.data.locale = this.status.locale;
    this.config.data.userDir = this.status.userDir;
    this.config.data.credentialSecret = this.status.credentialSecret;
    this.config.data.projectsEnabled = this.status.projectsEnabled;
    this.config.data.nodesExcludes = this.status.nodesExcludes;
    this.config.data.autoCheckUpdate = this.status.autoCheckUpdate;
    this.config.data.allowPrerelease = this.status.allowPrerelease;
    this.config.data.autoDownload = this.status.autoDownload;
    this.config.data.hideOnMinimize = this.status.hideOnMinimize;
    this.config.data.openLastFile = this.status.openLastFile;
    this.config.data.httpNodeAuth = this.status.httpNodeAuth;
    this.config.data.listenPort = this.status.listenPort;
    this.config.data.debugOut = this.status.debugOut;
    this.config.save();
  }

  private usingTmpFile() {
    return this.fileManager.test(this.status.currentFile);
  }

  private checkEphemeralFile() {
    if (this.usingTmpFile()) {
      return this.status.newfileChanged;
    } else {
      return this.status.modified;
    }
  }

  private leavable(): boolean {
    if (!this.checkEphemeralFile()) return true;
    const res = dialog.showMessageBoxSync(this.getBrowserWindow(), {
      type: "question",
      title: i18n.__("dialog.confirm"),
      message: i18n.__("dialog.closeMsg"),
      buttons: [
        i18n.__("dialog.yes"),
        i18n.__("dialog.no"),
        i18n.__("dialog.cancel")
      ]
    });
    if (res === 0) {
      if (!this.status.projectsEnabled && this.usingTmpFile()) {
        return this.onFileSaveAs();
      } else {
        return this.onFileSave();
      }
    } else if (res === 1) {
      return true;
    } else {
      return false;
    }
  }

  private onMinimize(event?: Electron.Event) {
    if (!this.status.hideOnMinimize) return;
    event!.preventDefault();
    this.getBrowserWindow().hide();
  }

  private isSettingsPage() {
    const url = path.parse(this.getBrowserWindow().webContents.getURL());
    return (url.base === path.parse(this.settingsURL).base)
  }

  private onBeforeClose(event?: Electron.Event) {
    if (this.isSettingsPage()) {
      this.unsetBeforeUnload();
    } else if (this.leavable()) {
      this.unsetBeforeUnload();
      this.saveConfig();
    } else {
      if (event) event.preventDefault();
    }
  }

  private unsetBeforeUnload() {
    this.getBrowserWindow().webContents.send("force:reload");
  }

  private onClosed() {
    this.fileManager.clearTmp();
    this.tray?.destroy();
    this.mainWindow = null;
  }

  private onRestart() {
    this.onBeforeClose();
    this.customAutoUpdater!.quitAndInstall();
    app.quit();
  }

  private onRelaunch() {
    this.onBeforeClose();
    app.relaunch();
    app.quit();
  }

  private setLangUrl(url: string) {
    const current = urlparse.parse(url);
    current.search = "?setLng=" + this.status.locale;
    return urlparse.format(current);
  }

  private setTitle() {
    this.getBrowserWindow().setTitle(this.red.windowTitle());
  }

  private setProgress(progress: number){
    this.getBrowserWindow().setProgressBar(progress);
  }

  private onLoading() {
    return this.getBrowserWindow().loadURL(this.loadingURL);
  }

  private async go(url: string) {
    if (!url) throw new Error("no url")
    await this.getBrowserWindow().loadURL(this.setLangUrl(url));
    this.setTitle();
  }

  private onMessage(text: string) {
    // this.getBrowserWindow().webContents.send("message", text);
    const msg: Electron.NotificationConstructorOptions = {
      title: app.name,
      body: text,
      closeButtonText: i18n.__("dialog.ok")
    };
    const notification = new Notification(msg);
    notification.show();
  }

  private onSignIn(event: Electron.Event, args: any) {}

  private onSignedIn(event: Electron.Event, args: any) {}

  private async checkNodeVersion() {
    try {
      const res: execResult = await this.red.exec.run("node", ["-v"], {}, false);
      log.info(">>> Check node.js version", res);
      if (res.code === 0) {
        const range = semver.validRange(process.version.split(".")[0]);
        return semver.satisfies(res.stdout.trim(), range)
      }
    } catch (err) {
      log.error(err);
    }
    return false;
  }

  private async checkNpmVersion() {
    try {
      const res: execResult = await this.red.exec._run(NPM_COMMAND, ["-v"], {}, false);
      log.info(">>> Check npm version", res);
      return (res.code === 0);
    } catch (err) {
      log.error(err);
    }
    return false;
  }

  private async onEditorStarted(event: Electron.Event, args: any) {
    this.status.editorEnabled = true;
    this.status.nodeCommandEnabled = await this.checkNodeVersion();
    this.status.npmCommandEnabled = await this.checkNpmVersion();
    ipcMain.emit("menu:update");
  }

  private onNodesChange(event: Electron.Event, args: {dirty: boolean}) {
    this.status.modified = args.dirty;
    if (args.dirty) this.status.newfileChanged = true;
  }

  private onSelectionChanged(event: Electron.Event, selection: {nodes: any[]}){
    this.status.selection = selection;
    this.appMenu!.setMenuItemEnabled("tools.nodegen",
      selection && 
      selection.nodes && 
      selection.nodes[0] &&
      selection.nodes[0].type === "function" &&
      !!this.red.getNode(selection.nodes[0].id))
  }

  private updateMenu() {
    this.appMenu!.setup();
  }

  private async openAny(url: string) {
    await shell.openExternal(url);
  }

  private onNewWindow(url: string) {
    this.openAny(url);
  }

  private onFileNew() {
    const file = this.fileManager.createTmp();
    this.status.newfileChanged = false;
    this.setFlowFileAndRestart(file);
  }

  private getBrowserWindow() {
    if (this.mainWindow === null) {
      this.create();
      this.go(this.red.getAdminUrl());
    }
    return this.mainWindow!.getBrowserWindow()!;
  }

  private onFileOpen(file: string = "") {
    if (!file) {
      const files = dialog.showOpenDialogSync(this.getBrowserWindow(), {
        title: i18n.__("dialog.openFlowFile"),
        properties: ["openFile"],
        defaultPath: path.dirname(this.status.currentFile),
        filters: [
          { name: "flows file", extensions: ["json"] },
          { name: "ALL", extensions: ["*"] }
        ]
      });
      if (files) file = files[0];
    }
    if (file) {
      this.fileHistory.add(file);
      this.setFlowFileAndRestart(file);
    }
  }

  private onFileSave(): boolean {
    this.getBrowserWindow().webContents.send("editor:deploy");
    return true;
  }

  private onFileSaveAs(): boolean {
    const savefile = dialog.showSaveDialogSync(this.getBrowserWindow(), {
      title: i18n.__("dialog.saveFlowFile"),
      defaultPath: path.dirname(this.status.currentFile),
      filters: [
        { name: "flows file", extensions: ["json"] },
        { name: "ALL", extensions: ["*"] }
      ]
    });
    if (!savefile) return false;
    const oldfile = this.status.currentFile;
    this.red.setFlowFile(savefile);
    if (this.status.modified) {
      this.onFileSave();
    } else {
      this.fileManager.saveAs(oldfile, savefile);
    }
    this.fileHistory.add(savefile);
    return true;
  }

  private onFileClearHistory() {
    this.fileHistory.clear();
  }

  private setFlowFileAndRestart(file: string) {
    if (!this.leavable()) return;
    this.unsetBeforeUnload();
    this.red.setFlowFileAndRestart(file);
  }

  private onUserdirOpen() {
    this.openAny(pathToFileURL(this.status.userDir).href);
  }

  private onLogfileOpen() {
    this.openAny(pathToFileURL(log.transports.file.file!).href);
  }

  private onSettings() {
    return this.getBrowserWindow().loadURL(this.settingsURL);
  }

  private onEndpointLocal() {
    this.openAny(this.red.getHttpUrl());
  }

  private onEndpointLocalAdmin() {
    this.openAny(this.red.getAdminUrl());
  }

  private async onNgrokConnect() {
    try {
      const ngrokOptions: ngrok.INgrokOptions = {
        proto: "http",
        addr: this.red.listenPort,
        binPath: (bin: string) => bin.replace("app.asar", "app.asar.unpacked")
      };
      if (process.env.NRD_NGROK_START_ARGS) {
        ngrokOptions.startArgs = process.env.NRD_NGROK_START_ARGS
      }
      const url = await ngrok.connect(ngrokOptions);
      this.status.ngrokUrl = url;
      this.status.ngrokStarted = true;
      ipcMain.emit("menu:update");
      const body = `conntcted with <a href="${this.status.ngrokUrl}" target="_blank">${this.status.ngrokUrl}</a>`;
      this.showRedNotify("success", body);
    } catch (err) {
      log.error(err);
      this.showRedNotify("error", JSON.stringify(err));
    }
  }
  private async onNgrokDisconnect() {
    try {
      await ngrok.disconnect(this.status.ngrokUrl);
      await ngrok.disconnect(
        this.status.ngrokUrl.replace("https://", "http://")
      );
      this.showRedNotify("success", `disconnected ${this.status.ngrokUrl}`, 3000);
      this.status.ngrokUrl = "";
      ipcMain.emit("menu:update");
    } catch (err) {
      log.error(err);
    }
  }

  private onEndpointPublic() {
    if (!this.status.ngrokUrl) return;
    this.openAny(this.status.ngrokUrl);
  }

  private onNgrokInspect() {
    if (this.status.ngrokStarted) this.openAny(NGROK_INSPECT_URL);
  }

  private async onViewReload(item: MenuItem, focusedWindow: BrowserWindow) {
    if (focusedWindow) {
      await focusedWindow.loadURL(focusedWindow.webContents.getURL());
      this.setTitle();
    }
  }

  private onSetLocale(item: MenuItem, focusedWindow: BrowserWindow) {
    this.status.locale = item.label;
    if (focusedWindow) {
      const url = this.setLangUrl(focusedWindow.webContents.getURL());
      focusedWindow.loadURL(url);
    }
  }

  private onHelpWeb(url: string) {
    shell.openExternal(url);
  }

  private onHelpCheckUpdates() {
    this.customAutoUpdater!.checkUpdates(true);
  }

  private onHelpVersion() {
    const body = `
      Name: ${app.name} 
      ${i18n.__("version.version")}: ${app.getVersion()}
      ${this.customAutoUpdater!.info()}
      ${this.red.info()}
      ${this.fileManager.info()}
    `.replace(/^\s*/gm, "");

    dialog.showMessageBoxSync(this.getBrowserWindow(), {
      title: i18n.__("menu.version"),
      type: "info",
      message: app.name,
      detail: body,
      buttons: [i18n.__("dialog.ok")],
      noLink: true
    });
  }

  private showRedNotify(type: "success" | "error" | "info", message: string, timeout?: number) {
    this.getBrowserWindow().webContents.send("red:notify", type, message, timeout);   
  }

  private onToggleDevTools(item: MenuItem, focusedWindow: BrowserWindow) {
    if (focusedWindow) focusedWindow.webContents.toggleDevTools();
  }

  private onSettingsLoaded() {
    this.getBrowserWindow().webContents.send("settings:set", this.config.data);
  }

  private onSettingsSubmit(event: Electron.Event, args: UserSettings) {
    this.status.userDir = args.userDir;
    this.status.credentialSecret = args.credentialSecret;
    this.status.nodesExcludes = args.nodesExcludes.trim().split("\n");
    this.status.projectsEnabled = args.projectsEnabled;
    this.status.autoCheckUpdate = args.autoCheckUpdate;
    this.status.allowPrerelease = args.allowPrerelease;
    this.status.autoDownload = args.autoDownload;
    this.status.hideOnMinimize = args.hideOnMinimize;
    this.status.openLastFile = args.openLastFile;
    this.status.httpNodeAuth = args.httpNodeAuth;
    this.status.listenPort = args.listenPort;
    this.saveConfig();
    app.relaunch();
    app.quit();
  }

  private onSettingsCancel() {
    this.go(this.red.getAdminUrl());
  }

  private showShade() {
    this.getBrowserWindow().webContents.send("shade:show");
    this.appMenu!.enabled = false;
  }

  private loadingShade() {
    this.getBrowserWindow().webContents.send("shade:start");
  }

  private hideShade() {
    this.appMenu!.enabled = true;
    this.getBrowserWindow().webContents.send("shade:hide");
  }

  private async onNodeAddLocal() {
    this.showShade();
    const dirs = dialog.showOpenDialogSync(this.getBrowserWindow(), {
      title: i18n.__("dialog.openNodeDir"),
      properties: ["openDirectory"],
      defaultPath: this.status.userDir
    });
    if (dirs) {
      this.loadingShade();
      await this.red.execNpmLink(dirs[0]);
    }
    this.hideShade();
  }

  private async onNodeAddRemote() {
    this.showShade();
    const res = await prompt({
      width: this.getBrowserWindow().getBounds().width * 0.5,
      height: 200,
      resizable: true,
      title: i18n.__("dialog.npmInstall"),
      label: i18n.__("dialog.npmInstallDesc"),
      value: "",
      inputAttrs: {
        type: "text",
        required: true
      },
      useHtmlLabel: true,
      minimizable: false,
      maximizable: false
    }, this.getBrowserWindow());
    if (res) {
      this.loadingShade();
      await this.red.execNpmInstall(res);
    }
    this.hideShade();
  }

  // private async onNodeRebuild() {
  //   log.info(">>> Rebuild Start")
  //   this.showShade();
  //   try {
  //     this.loadingShade();
  //     await rebuild({
  //       buildPath: this.status.userDir,
  //       electronVersion: process.versions.electron
  //     });
  //     log.info(">>> Rebuild success");
  //   } catch(err) {
  //     log.error(">>> Rebuild failed", err);
  //     this.showRedNotify("error", JSON.stringify(err));
  //   }
  //   this.hideShade();
  // }

  private async onNodeGenerator() {
    const node = this.red.getNode(this.status.selection.nodes[0].id);
    if (!node){
      dialog.showMessageBox(this.getBrowserWindow(), {
        title: i18n.__("dialog.nodegen"),
        type: "info",
        message: app.name,
        detail: i18n.__("dialog.nodenotfound"),
        buttons: [i18n.__("dialog.ok")],
        noLink: true
      });
      return;
    }
    const data = {
      dst: this.status.userDir,
      src: [
        `// name: ${node.name || "no name"}`,
        `// outputs: ${node.wires.length}`,
        node.func, ""
      ].join("\n")
    };
    const options = {};

    log.info(">>> nodegen Start", data)
    this.showShade();
    try {
      this.loadingShade();
      const result = await nodegen.function2node(data, options)
      log.info(">>> nodegen success", result);
      this.openAny(pathToFileURL(result).href);
      // await this.red.execNpmLink(result);
    } catch(err) {
      log.error(">>> nodegen failed", err);
      this.showRedNotify("error", JSON.stringify(err));
    }
    this.hideShade();
  }

  private onDebugOut() {
    this.status.debugOut = !this.status.debugOut
    console.log(this.status)
  }
}

const main: BaseApplication = new BaseApplication(app);
