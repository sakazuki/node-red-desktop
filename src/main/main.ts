import {
  app,
  App,
  BaseWindow,
  BrowserWindowConstructorOptions,
  ipcMain,
  MenuItem,
  BrowserWindow,
  dialog,
  shell,
  Notification,
} from "electron";
import { CustomBrowserWindow } from "./browser-window";
import { AppMenu } from "./menu";
import path from "path";
import { CustomAutoUpdater } from "./auto-update";
import i18n from "./i18n";
import urlparse from "url";
import { FileHistory } from "./file-history";
import { appEventBus } from "./app-event-bus";
import { FileManager } from "./file-manager";
import { ConfigManager } from "./config-manager";
import { CustomTray } from "./tray";
import { NgrokManager } from "./ngrok-manager";
import { NodeREDApp, NPM_COMMAND } from "./node-red";
import log from "./log";
import fs from "fs";
import { pathToFileURL } from "url";
import semver from "semver";
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
  httpNodeAuth: { user: string; pass: string };
  selection: { nodes: any[] };
  listenPort: string;
  debugOut: boolean;
  ngrokAuthtoken: string;
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
  httpNodeAuth: { user: string; pass: string };
  listenPort: string;
  debugOut: boolean;
  ngrokAuthtoken: string;
};

class BaseApplication {
  private mainWindow: CustomBrowserWindow | null = null;
  private customAutoUpdater: CustomAutoUpdater | null = null;
  private appMenu: AppMenu | null = null;
  private tray: CustomTray | null = null;
  private app: App;
  private loadingURL: string = pathToFileURL(
    path.join(__dirname, "..", "loading.html"),
  ).href;
  private settingsURL: string = pathToFileURL(
    path.join(__dirname, "..", "settings.html"),
  ).href;
  private config: ConfigManager;
  private fileManager: FileManager;
  private fileHistory: FileHistory;
  private status: AppStatus;
  private red: NodeREDApp;
  private ngrokManager: NgrokManager = new NgrokManager();

  constructor(app: App) {
    this.app = app;
    this.app.on("ready", this.onReady.bind(this));
    this.app.on("activate", this.onActivated.bind(this));
    this.app.on("window-all-closed", this.onWindowAllClosed.bind(this));
    this.config = new ConfigManager(app.name);
    this.fileManager = new FileManager(this.config);
    this.fileHistory = new FileHistory(FILE_HISTORY_SIZE);
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
      selection: { nodes: [] },
      listenPort: this.config.data.listenPort,
      debugOut: this.config.data.debugOut,
      ngrokAuthtoken: this.config.data.ngrokAuthtoken,
    };
    this.appMenu = new AppMenu(this.status, this.fileHistory);
    this.red = new NodeREDApp(this.status);
    appEventBus.on("browser:focus", this.setTitle.bind(this));
    appEventBus.on("browser:show", () => this.getBrowserWindow().show());
    appEventBus.on("browser:hide", () => this.getBrowserWindow().hide());
    appEventBus.on("browser:minimize", (event: Electron.Event) =>
      this.onMinimize(event),
    );
    appEventBus.on("browser:before-close", (event: Electron.Event) =>
      this.onBeforeClose(event),
    );
    appEventBus.on("browser:closed", this.onClosed.bind(this));
    appEventBus.on("browser:restart", this.onRestart.bind(this));
    appEventBus.on("browser:relaunch", this.onRelaunch.bind(this));
    appEventBus.on("browser:message", (text: string) => this.onMessage(text));
    appEventBus.on("browser:loading", this.onLoading.bind(this));
    appEventBus.on("browser:go", (url: string) => this.go(url));
    appEventBus.on("browser:update-title", this.setTitle.bind(this));
    appEventBus.on("browser:progress", (progress: number) =>
      this.setProgress(progress),
    );
    appEventBus.on("history:update", this.updateMenu.bind(this));
    appEventBus.on("menu:update", this.updateMenu.bind(this));
    // @ts-ignore
    ipcMain.on("window:new", (url: string) => this.onNewWindow(url));
    ipcMain.on("auth:signin", (event: Electron.Event, args: any) =>
      this.onSignIn(event, args),
    );
    ipcMain.on("auth:signedin", (event: Electron.Event, args: any) =>
      this.onSignedIn(event, args),
    );
    ipcMain.on("editor:started", (event: Electron.Event, args: any) =>
      this.onEditorStarted(event, args),
    );
    ipcMain.on(
      "nodes:change",
      (event: Electron.Event, args: { dirty: boolean }) =>
        this.onNodesChange(event, args),
    );
    ipcMain.on(
      "view:selection-changed",
      (event: Electron.Event, selection: { nodes: any[] }) =>
        this.onSelectionChanged(event, selection),
    );
    appEventBus.on("file:new", this.onFileNew.bind(this));
    appEventBus.on("file:open", this.onFileOpen.bind(this));
    appEventBus.on("file:clear-recent", this.onFileClearHistory.bind(this));
    appEventBus.on("file:save", this.onFileSave.bind(this));
    appEventBus.on("file:save-as", this.onFileSaveAs.bind(this));
    appEventBus.on("file:open-userdir", this.onUserdirOpen.bind(this));
    appEventBus.on("file:open-logfile", this.onLogfileOpen.bind(this));
    appEventBus.on("settings", this.onSettings.bind(this));
    appEventBus.on("endpoint:local", this.onEndpointLocal.bind(this));
    appEventBus.on(
      "endpoint:local-admin",
      this.onEndpointLocalAdmin.bind(this),
    );
    appEventBus.on("endpoint:public", this.onEndpointPublic.bind(this));
    appEventBus.on("ngrok:connect", this.onNgrokConnect.bind(this));
    appEventBus.on("ngrok:disconnect", this.onNgrokDisconnect.bind(this));
    appEventBus.on("ngrok:inspect", this.onNgrokInspect.bind(this));
    appEventBus.on(
      "view:reload",
      (item: MenuItem, focusedWindow: BaseWindow | undefined) =>
        this.onViewReload(item, focusedWindow),
    );
    appEventBus.on(
      "view:set-locale",
      (item: MenuItem, focusedWindow: BaseWindow | undefined) =>
        this.onSetLocale(item, focusedWindow),
    );
    appEventBus.on("help:node-red", () => {
      this.onHelpWeb(HELP_NODERED_URL);
    });
    appEventBus.on("help:node-red-desktop", () => {
      this.onHelpWeb(HELP_NODERED_DESKTOP_URL);
    });
    appEventBus.on("help:author", () => {
      this.onHelpWeb(HELP_AUTHOR_URL);
    });
    appEventBus.on("help:check-updates", this.onHelpCheckUpdates.bind(this));
    appEventBus.on("help:version", this.onHelpVersion.bind(this));
    appEventBus.on(
      "dev:tools",
      (item: MenuItem, focusedWindow: BaseWindow | undefined) =>
        this.onToggleDevTools(item, focusedWindow),
    );
    ipcMain.on("settings:loaded", this.onSettingsLoaded.bind(this));
    ipcMain.on("settings:update", (event: Electron.Event, args: UserSettings) =>
      this.onSettingsSubmit(event, args),
    );
    ipcMain.on("settings:cancel", this.onSettingsCancel.bind(this));
    appEventBus.on("node:addLocal", this.onNodeAddLocal.bind(this));
    appEventBus.on("node:addRemote", this.onNodeAddRemote.bind(this));
    appEventBus.on(
      "dialog:show",
      (type: "success" | "error" | "info", message: string, timeout?: number) =>
        this.showRedNotify(type, message, timeout),
    );
    ipcMain.on("ext:debugOut", this.onDebugOut.bind(this));
    // Test-only handlers: emit events on app-event-bus for E2E test access
    ipcMain.on("test:node:addLocal", () => {
      appEventBus.emit("node:addLocal");
    });
    ipcMain.on("test:node:addRemote", () => {
      appEventBus.emit("node:addRemote");
    });
  }

  private create() {
    const options: BrowserWindowConstructorOptions = {
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        // Task 5.1: sandbox is intentionally false because the preload script
        // (preload.ts) requires Node.js built-ins (require/path) to load the
        // i18n module.  The renderer is still isolated via contextIsolation:true
        // and nodeIntegration:false, which enforces the security boundary.
        // Setting sandbox:true would break the preload's Node.js access.
        sandbox: false,
        preload: path.join(__dirname, "preload.js"),
        defaultFontFamily: {
          standard: "Meiryo UI",
          serif: "MS PMincho",
          sansSerif: "Meiryo UI",
          monospace: "MS Gothic",
        },
      },
      title: app.name,
      fullscreenable: true,
      width: 1280,
      height: 960,
      minWidth: 500,
      minHeight: 200,
      acceptFirstMouse: true,
      autoHideMenuBar: true,
      // titleBarStyle: "hidden",
      icon: path.join(__dirname, "..", "images", "favicon.ico"),
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
      this.status,
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
    this.config.data.ngrokAuthtoken = this.status.ngrokAuthtoken;
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

  private async leavable(): Promise<boolean> {
    if (!this.checkEphemeralFile()) return true;
    const { response: res } = await dialog.showMessageBox(
      this.getBrowserWindow(),
      {
        type: "question",
        title: i18n.__("dialog.confirm"),
        message: i18n.__("dialog.closeMsg"),
        buttons: [
          i18n.__("dialog.yes"),
          i18n.__("dialog.no"),
          i18n.__("dialog.cancel"),
        ],
      },
    );
    if (res === 0) {
      if (!this.status.projectsEnabled && this.usingTmpFile()) {
        return await this.onFileSaveAs();
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
    return url.base === path.parse(this.settingsURL).base;
  }

  private async onBeforeClose(event?: Electron.Event) {
    if (this.isSettingsPage()) {
      this.unsetBeforeUnload();
    } else if (await this.leavable()) {
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

  private async onRestart() {
    await this.onBeforeClose();
    this.customAutoUpdater!.quitAndInstall();
    app.quit();
  }

  private async onRelaunch() {
    await this.onBeforeClose();
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

  private setProgress(progress: number) {
    this.getBrowserWindow().setProgressBar(progress);
  }

  private onLoading() {
    return this.getBrowserWindow().loadURL(this.loadingURL);
  }

  private async go(url: string) {
    if (!url) throw new Error("no url");
    await this.getBrowserWindow().loadURL(this.setLangUrl(url));
    this.setTitle();
  }

  private onMessage(text: string) {
    // this.getBrowserWindow().webContents.send("message", text);
    const msg: Electron.NotificationConstructorOptions = {
      title: app.name,
      body: text,
      closeButtonText: i18n.__("dialog.ok"),
    };
    const notification = new Notification(msg);
    notification.show();
  }

  private onSignIn(event: Electron.Event, args: any) {}

  private onSignedIn(event: Electron.Event, args: any) {}

  private async checkNodeVersion() {
    try {
      const res: execResult = await this.red.exec.run(
        "node",
        ["-v"],
        {},
        false,
      );
      log.info(">>> Check node.js version", res);
      if (res.code === 0) {
        const range = semver.validRange(process.version.split(".")[0]);
        if (!range) throw new Error("Invalid version");
        return semver.satisfies(res.stdout.trim(), range);
      }
    } catch (err) {
      log.error(err);
    }
    return false;
  }

  private async checkNpmVersion() {
    try {
      const res: execResult = await this.red.exec.run(
        NPM_COMMAND,
        ["-v"],
        {},
        false,
      );
      log.info(">>> Check npm version", res);
      return res.code === 0;
    } catch (err) {
      log.error(err);
    }
    return false;
  }

  private async onEditorStarted(event: Electron.Event, args: any) {
    this.status.editorEnabled = true;
    this.status.nodeCommandEnabled = await this.checkNodeVersion();
    this.status.npmCommandEnabled = await this.checkNpmVersion();
    appEventBus.emit("menu:update");
  }

  private onNodesChange(event: Electron.Event, args: { dirty: boolean }) {
    this.status.modified = args.dirty;
    if (args.dirty) this.status.newfileChanged = true;
  }

  private onSelectionChanged(
    event: Electron.Event,
    selection: { nodes: any[] },
  ) {
    this.status.selection = selection;
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

  private async onFileNew() {
    const file = this.fileManager.createTmp();
    this.status.newfileChanged = false;
    await this.setFlowFileAndRestart(file);
  }

  private getBrowserWindow() {
    if (this.mainWindow === null) {
      this.create();
      this.go(this.red.getAdminUrl());
    }
    return this.mainWindow!.getBrowserWindow()!;
  }

  private async onFileOpen(file: string = "") {
    if (!file) {
      const { filePaths } = await dialog.showOpenDialog(
        this.getBrowserWindow(),
        {
          title: i18n.__("dialog.openFlowFile"),
          properties: ["openFile"],
          defaultPath: path.dirname(this.status.currentFile),
          filters: [
            { name: "flows file", extensions: ["json"] },
            { name: "ALL", extensions: ["*"] },
          ],
        },
      );
      if (filePaths && filePaths.length > 0) file = filePaths[0];
    }
    if (file) {
      this.fileHistory.add(file);
      await this.setFlowFileAndRestart(file);
    }
  }

  private onFileSave(): boolean {
    this.getBrowserWindow().webContents.send("editor:deploy");
    return true;
  }

  private async onFileSaveAs(): Promise<boolean> {
    const { filePath: savefile } = await dialog.showSaveDialog(
      this.getBrowserWindow(),
      {
        title: i18n.__("dialog.saveFlowFile"),
        defaultPath: path.dirname(this.status.currentFile),
        filters: [
          { name: "flows file", extensions: ["json"] },
          { name: "ALL", extensions: ["*"] },
        ],
      },
    );
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

  private async setFlowFileAndRestart(file: string) {
    if (!(await this.leavable())) return;
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
      const url = await this.ngrokManager.connect(
        this.red.listenPort,
        this.status.ngrokAuthtoken,
      );
      this.status.ngrokUrl = url;
      this.status.ngrokStarted = true;
      appEventBus.emit("menu:update");
      const body = `conntcted with <a href="${this.status.ngrokUrl}" target="_blank">${this.status.ngrokUrl}</a>`;
      this.showRedNotify("success", body);
    } catch (err) {
      log.error(err);
      this.showRedNotify("error", JSON.stringify(err));
    }
  }

  private async onNgrokDisconnect() {
    try {
      await this.ngrokManager.disconnect();
      this.showRedNotify(
        "success",
        `disconnected ${this.status.ngrokUrl}`,
        3000,
      );
      this.status.ngrokUrl = "";
      this.status.ngrokStarted = false;
      appEventBus.emit("menu:update");
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

  private async onViewReload(
    item: MenuItem,
    focusedWindow: BaseWindow | undefined,
  ) {
    if (focusedWindow) {
      // loadURL is on BrowserWindow; focusedWindow in this app is always a BrowserWindow
      const bw = focusedWindow as BrowserWindow;
      await bw.loadURL(bw.webContents.getURL());
      this.setTitle();
    }
  }

  private onSetLocale(item: MenuItem, focusedWindow: BaseWindow | undefined) {
    this.status.locale = item.label;
    if (focusedWindow) {
      // loadURL is on BrowserWindow; focusedWindow in this app is always a BrowserWindow
      const bw = focusedWindow as BrowserWindow;
      const url = this.setLangUrl(bw.webContents.getURL());
      bw.loadURL(url);
    }
  }

  private onHelpWeb(url: string) {
    shell.openExternal(url);
  }

  private onHelpCheckUpdates() {
    this.customAutoUpdater!.checkUpdates(true);
  }

  private async onHelpVersion() {
    const body = `
      Name: ${app.name}
      ${i18n.__("version.version")}: ${app.getVersion()}
      ${this.customAutoUpdater!.info()}
      ${this.red.info()}
      ${this.fileManager.info()}
    `.replace(/^\s*/gm, "");

    await dialog.showMessageBox(this.getBrowserWindow(), {
      title: i18n.__("menu.version"),
      type: "info",
      message: app.name,
      detail: body,
      buttons: [i18n.__("dialog.ok")],
      noLink: true,
    });
  }

  private showRedNotify(
    type: "success" | "error" | "info",
    message: string,
    timeout?: number,
  ) {
    this.getBrowserWindow().webContents.send(
      "red:notify",
      type,
      message,
      timeout,
    );
  }

  private onToggleDevTools(
    item: MenuItem,
    focusedWindow: BaseWindow | undefined,
  ) {
    if (focusedWindow && "webContents" in focusedWindow) {
      (focusedWindow as BrowserWindow).webContents.toggleDevTools();
    }
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
    this.status.ngrokAuthtoken = args.ngrokAuthtoken;
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
    const { filePaths: dirs } = await dialog.showOpenDialog(
      this.getBrowserWindow(),
      {
        title: i18n.__("dialog.openNodeDir"),
        properties: ["openDirectory"],
        defaultPath: this.status.userDir,
      },
    );
    if (dirs && dirs.length > 0) {
      this.loadingShade();
      await this.red.execNpmLink(dirs[0]);
    }
    this.hideShade();
  }

  private async onNodeAddRemote() {
    this.showShade();
    const { showInputPrompt } = await import("./prompt-dialog.js");
    const res = await showInputPrompt(
      {
        width: this.getBrowserWindow().getBounds().width * 0.5,
        height: 200,
        resizable: true,
        title: i18n.__("dialog.npmInstall"),
        label: i18n.__("dialog.npmInstallDesc"),
        value: "",
        minimizable: false,
        maximizable: false,
      },
      this.getBrowserWindow(),
    );
    if (res) {
      this.loadingShade();
      await this.red.execNpmInstall(res);
    }
    this.hideShade();
  }

  private onDebugOut() {
    this.status.debugOut = !this.status.debugOut;
    console.log(this.status);
  }
}

const main: BaseApplication = new BaseApplication(app);
