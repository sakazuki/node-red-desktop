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
import { NodeREDApp } from "./node-red";
import log from "./log";
import fs from "fs-extra";
import fileUrl from "file-url";

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
}

class BaseApplication {
  private mainWindow: CustomBrowserWindow | null = null;
  private customAutoUpdater: CustomAutoUpdater | null = null;
  private appMenu: AppMenu | null = null;
  private tray: CustomTray | null = null;
  private app: App;
  private loadingURL: string = fileUrl(
    path.join(__dirname, "..", "loading.html")
  );
  private settingsURL: string = fileUrl(
    path.join(__dirname, "..", "settings.html")
  );
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
    this.config = new ConfigManager(app.getName());
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
      hideOnMinimize: this.config.data.hideOnMinimize
    };
    this.appMenu = new AppMenu(this.status, this.fileHistory);
    this.red = new NodeREDApp(this.status);
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
    ipcMain.on("browser:message", (text: string) => this.onMessage(text));
    ipcMain.on("browser:loading", this.onLoading.bind(this));
    ipcMain.on("browser:go", (url: string) => this.go(url));
    ipcMain.on("browser:update-title", this.setTitle.bind(this));
    ipcMain.on("history:update", this.updateMenu.bind(this));
    ipcMain.on("menu:update", this.updateMenu.bind(this));
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
    ipcMain.on("nodes:change", (event: Electron.Event, args: any) =>
      this.onNodesChange(event, args)
    );
    ipcMain.on("file:new", this.onFileNew.bind(this));
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
    ipcMain.on("view:reload", (item: MenuItem, focusedWindow: BrowserWindow) =>
      this.onViewReload(item, focusedWindow)
    );
    ipcMain.on(
      "view:set-locale",
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
    ipcMain.on("dev:tools", (item: MenuItem, focusedWindow: BrowserWindow) =>
      this.onToggleDevTools(item, focusedWindow)
    );
    ipcMain.on("settings:loaded", this.onSettingsLoaded.bind(this));
    ipcMain.on("settings:update", (event: Electron.Event, args: any) =>
      this.onSettingsSubmit(event, args)
    );
    ipcMain.on("settings:cancel", this.onSettingsCancel.bind(this));
  }

  private create() {
    const options: BrowserWindowConstructorOptions = {
      webPreferences: {
        nodeIntegration: false,
        preload: path.join(__dirname, "preload.js"),
        defaultFontFamily: {
          standard: "Meiryo UI",
          serif: "MS PMincho",
          sansSerif: "Meiryo UI",
          monospace: "MS Gothic"
        }
      },
      title: app.getName(),
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
    this.fileHistory.load(this.config.data.recentFiles);
  }

  private getStartFlow(): string {
    const args = process.argv[2];
    if (args && fs.existsSync(args)) {
      return args;
    } else {
      return this.fileManager.createTmp();
    }
  }

  private onReady() {
    try {
      i18n.setLocale(this.config.data.locale);
    } catch (err) {
      log.error(err);
    }
    this.status.locale = i18n.getLocale();
    this.create();
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
    if (process.platform !== "darwin") this.app.quit();
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
    const res = dialog.showMessageBox(this.getBrowserWindow(), {
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
      if (this.usingTmpFile()) {
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

  private onBeforeClose(event?: Electron.Event) {
    const url = path.parse(this.getBrowserWindow().webContents.getURL());
    if (url.base === path.parse(this.settingsURL).base) {
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
    this.mainWindow = null;
  }

  private onRestart() {
    this.onBeforeClose();
    this.customAutoUpdater!.quitAndInstall();
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

  private onLoading() {
    return this.getBrowserWindow().loadURL(this.loadingURL);
  }

  private async go(url: string) {
    await this.getBrowserWindow().loadURL(this.setLangUrl(url));
    this.setTitle();
  }

  private onMessage(text: string) {
    // this.getBrowserWindow().webContents.send("message", text);
    const msg: Electron.NotificationConstructorOptions = {
      title: app.getName(),
      body: text,
      closeButtonText: i18n.__("dialog.ok")
    };
    const notification = new Notification(msg);
    notification.show();
  }

  private onSignIn(event: Electron.Event, args: any) {}

  private onSignedIn(event: Electron.Event, args: any) {}

  private onEditorStarted(event: Electron.Event, args: any) {
    this.status.editorEnabled = true;
    ipcMain.emit("menu:update");
  }

  private onNodesChange(event: Electron.Event, args: any) {
    this.status.modified = args.dirty;
    if (args.dirty) this.status.newfileChanged = true;
  }

  private updateMenu() {
    this.appMenu!.setup();
  }

  private openAny(url: string) {
    shell.openExternal(url);
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
    }
    return this.mainWindow!.getBrowserWindow()!;
  }

  private onFileOpen(file: string = "") {
    if (!file) {
      const files = dialog.showOpenDialog(this.getBrowserWindow(), {
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
    const savefile = dialog.showSaveDialog(this.getBrowserWindow(), {
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
    this.openAny(fileUrl(this.status.userDir));
  }

  private onLogfileOpen() {
    this.openAny(fileUrl(log.transports.file.file!));
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
      const url = await ngrok.connect({
        proto: "http",
        addr: this.red.listenPort
      });
      this.status.ngrokUrl = url;
      this.status.ngrokStarted = true;
      ipcMain.emit("menu:update");
      this.red.notify(
        {
          id: "ngrok",
          payload: {
            type: "success",
            text: "conntcted with " + this.status.ngrokUrl
          },
          retain: false
        },
        15000
      );
    } catch (err) {
      log.error(err);
      this.red.notify(
        {
          id: "ngrok",
          payload: {
            type: "error",
            text: err.msg + "\n" + err.details.err
          },
          retain: false
        },
        15000
      );
    }
  }
  private async onNgrokDisconnect() {
    try {
      await ngrok.disconnect(this.status.ngrokUrl);
      await ngrok.disconnect(
        this.status.ngrokUrl.replace("https://", "http://")
      );
      this.red.notify(
        {
          id: "ngrok",
          payload: {
            type: "success",
            text: "disconnected " + this.status.ngrokUrl
          },
          retain: false
        },
        3000
      );
      this.status.ngrokUrl = "";
      ipcMain.emit("menu:update");
    } catch (err) {
      log.error(err);
    }
  }

  private onEndpointPublic() {
    if (this.status.ngrokUrl) this.openAny(this.status.ngrokUrl);
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
      Name: ${app.getName()} 
      ${i18n.__("version.version")}: ${app.getVersion()}
      ${this.customAutoUpdater!.info()}
      ${this.red.info()}
      ${this.fileManager.info()}
    `.replace(/^\s*/gm, "");

    dialog.showMessageBox(this.getBrowserWindow(), {
      title: i18n.__("menu.version"),
      type: "info",
      message: app.getName(),
      detail: body,
      buttons: [i18n.__("dialog.ok")],
      noLink: true
    });
  }

  private onToggleDevTools(item: MenuItem, focusedWindow: BrowserWindow) {
    if (focusedWindow) focusedWindow.webContents.toggleDevTools();
  }

  private onSettingsLoaded() {
    this.getBrowserWindow().webContents.send("settings:set", this.config.data);
  }

  private onSettingsSubmit(event: Electron.Event, args: any) {
    this.status.userDir = args.userDir;
    this.status.credentialSecret = args.credentialSecret;
    this.status.nodesExcludes = args.nodesExcludes.trim().split("\n");
    this.status.projectsEnabled = args.projectsEnabled;
    this.status.autoCheckUpdate = args.autoCheckUpdate;
    this.status.allowPrerelease = args.allowPrerelease;
    this.status.autoDownload = args.autoDownload;
    this.status.hideOnMinimize = args.hideOnMinimize;
    this.saveConfig();
    app.relaunch();
    app.quit();
  }

  private onSettingsCancel() {
    this.go(this.red.getAdminUrl());
  }
}

const main: BaseApplication = new BaseApplication(app);
