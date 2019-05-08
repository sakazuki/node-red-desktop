import { app, App, BrowserWindowConstructorOptions, ipcMain, MenuItem, BrowserWindow, dialog, shell, Notification } from "electron";
import { MyBrowserWindow } from "./browser-window";
import { AppMenu } from "./menu"
import path from "path";
import { MyAutoUpdater } from "./auto-update";
import i18n from "./i18n";
import urlparse from "url";
import { FileHistory } from "./file-history";
import { FileManager } from "./file-manager";
import { ConfigManager } from "./config-manager";
import { MyTray } from "./tray";
import ngrok from "ngrok";
import { NodeREDApp } from "./node-red";
import log from "./log";

const FILE_HISTORY_SIZE = 10;
const HELP_WEB_URL = "https://nodered.org/";
const NGROK_INSPECT_URL = "http://localhost:4040";

export interface AppStatus {
  editorEnabled: boolean;
  ngrokUrl: string;
  ngrokStarted: boolean;
  modified: boolean;
  newfile_changed: boolean;
  locale: string;
  userDir: string;
  currentFile: string;
}

class BaseApplication {
  private mainWindow: MyBrowserWindow | null = null;
  private myAutoUpdater: MyAutoUpdater | null = null;
  private appMenu: AppMenu | null = null;
  private tray: MyTray | null = null;
  private app: App;
  // private mainURL: string = path.join(__dirname, "..", "index.html");
  private loadingURL: string = path.join(__dirname, "..", "loading.html");
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
    this.fileManager = new FileManager(app.getName());
    this.fileHistory = new FileHistory(FILE_HISTORY_SIZE, ipcMain);
    this.status = {
      editorEnabled: false,
      ngrokUrl: '',
      ngrokStarted: false,
      modified: false,
      newfile_changed: false,
      locale: app.getLocale(),
      userDir: this.fileManager.getUserDir(),
      currentFile: this.fileManager.createTmp()
    };
    this.appMenu = new AppMenu(this.status, this.fileHistory);
    this.red = new NodeREDApp(this.status);
    ipcMain.on("browser:show", () => this.getBrowserWindow().show());
    ipcMain.on("browser:hide", () => this.getBrowserWindow().hide());
    ipcMain.on("browser:before-close", (event: Electron.Event) => this.onBeforeClose(event));
    ipcMain.on("browser:closed", this.onClosed.bind(this));
    ipcMain.on("browser:restart", this.onRestart.bind(this));
    ipcMain.on("browser:message", (text: string) => this.onMessage(text));
    ipcMain.on("browser:loading", this.onLoading.bind(this));
    ipcMain.on("browser:go", (url: string) => this.go(url));
    ipcMain.on("browser:update-title", this.setTitle.bind(this));
    ipcMain.on("history:update", this.updateMenu.bind(this));
    ipcMain.on("menu:update", this.updateMenu.bind(this));
    ipcMain.on("window:new", (url: string) => this.onNewWindow(url));
    ipcMain.on("auth:signin", (event: Electron.Event, args: any) => this.onSignIn(event, args));
    ipcMain.on("auth:signedin", (event: Electron.Event, args: any) => this.onSignedIn(event, args));
    ipcMain.on("editor:started", (event: Electron.Event, args: any) => this.onEditorStarted(event, args));
    ipcMain.on("nodes:change", (event: Electron.Event, args: any) => this.onNodesChange(event, args));
    ipcMain.on("file:new", this.onFileNew.bind(this));
    ipcMain.on("file:open", this.onFileOpen.bind(this));
    ipcMain.on("file:clear-recent", this.onFileClearHistory.bind(this));
    ipcMain.on("file:save", this.onFileSave.bind(this));
    ipcMain.on("file:save-as", this.onFileSaveAs.bind(this));
    ipcMain.on("file:open-userdir", this.onUserdirOpen.bind(this));
    ipcMain.on("file:open-logfile", this.onLogfileOpen.bind(this));
    ipcMain.on("endpoint:local", this.onEndpointLocal.bind(this));
    ipcMain.on("endpoint:local-admin", this.onEndpointLocalAdmin.bind(this));
    ipcMain.on("endpoint:public", this.onEndpointPublic.bind(this));
    ipcMain.on("ngrok:connect", this.onNgrokConnect.bind(this));
    ipcMain.on("ngrok:disconnect", this.onNgrokDisconnect.bind(this));
    ipcMain.on("ngrok:inspect", this.onNgrokInspect.bind(this));
    ipcMain.on("view:reload", (item: MenuItem, focusedWindow: BrowserWindow) => this.onViewReload(item, focusedWindow));
    ipcMain.on("view:set-locale", (item: MenuItem, focusedWindow: BrowserWindow) => this.onSetLocale(item, focusedWindow));
    ipcMain.on("help:web", this.onHelpWeb.bind(this));
    ipcMain.on("help:check-updates", this.onHelpCheckUpdates.bind(this));
    ipcMain.on("help:version", this.onHelpVersion.bind(this));
    ipcMain.on("dev:tools",  (item: MenuItem, focusedWindow: BrowserWindow) => this.onToggleDevTools(item, focusedWindow));
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
    this.mainWindow = new MyBrowserWindow(options, this.loadingURL);
    this.fileHistory.load(this.config.data.recentFiles);
  }

  private onReady() {
    try {
      i18n.setLocale(this.config.data.locale || app.getLocale());
    } catch (err) { console.error(err) }
    this.status.locale = i18n.getLocale();
    this.create();
    this.myAutoUpdater = new MyAutoUpdater(this.getBrowserWindow());
    this.myAutoUpdater.checkUpdates(false);
    this.tray = new MyTray();
    this.red.startRED();
  }

  private onActivated() {
    if (this.mainWindow === null) this.create();
  }

  private onWindowAllClosed() {
    if (process.platform !== 'darwin') this.app.quit();
  }

  private saveConfig() {
    this.config.data.recentFiles = this.fileHistory.history;
    this.config.data.windowBounds = this.getBrowserWindow().getBounds();
    this.config.data.locale = this.status.locale;
    this.config.save();
  }

  private usingTmpFile() {
    return this.fileManager.test(this.status.currentFile);
  }

  private checkEphemeralFile() {
    if (this.usingTmpFile()) {
      return this.status.newfile_changed;
    } else {
      return this.status.modified;
    }
  }

  private leavable(): boolean {
    if (!this.checkEphemeralFile()) return true;
    const res = dialog.showMessageBox(this.getBrowserWindow(), {
      type: 'question',
      title: i18n.__('dialog.confirm'),
      message: i18n.__('dialog.closeMsg'),
      buttons: [
        i18n.__('dialog.yes'),
        i18n.__('dialog.no'),
        i18n.__('dialog.cancel')
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

  private onBeforeClose(event?: Electron.Event) {
    if (this.leavable()) {
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
  }

  private onRestart() {
    //TODO: test
    this.onBeforeClose();
    this.myAutoUpdater!.quitAndInstall();
    app.quit();
  }

  private setLangUrl(url: string){
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
      closeButtonText: i18n.__('dialog.ok')
    }
    const notification = new Notification(msg);
    notification.show();
  }

  private onSignIn(event: Electron.Event, args: any) {
  }

  private onSignedIn(event: Electron.Event, args: any) {
  }

  private onEditorStarted(event: Electron.Event, args: any) {
    this.status.editorEnabled = true;
    ipcMain.emit("menu:update");
  }

  private onNodesChange(event: Electron.Event, args: any) {
    this.status.modified = args.dirty;
    if (args.dirty) this.status.newfile_changed = true;
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
    this.status.newfile_changed = false;
    this.setFlowFileAndRestart(file);
  };

  private getBrowserWindow() {
    return this.mainWindow!.getBrowserWindow()!
  }

  private onFileOpen(file: string = '') {
    if (!file) {
      const files = dialog.showOpenDialog(this.getBrowserWindow(), {
        title: i18n.__('dialog.openFlowFile'),
        properties: ['openFile'],
        defaultPath: path.dirname(this.status.currentFile),
        filters: [
          { name: 'flows file', extensions: ['json'] },
          { name: 'ALL', extensions: ['*'] }
        ]
      });
      if (files) file = files[0];
    }
    if (file){
      this.fileHistory.add(file);
      this.setFlowFileAndRestart(file);
    }
  };

  private onFileSave(): boolean {
    this.getBrowserWindow().webContents.send("editor:deploy");
    return true;
  };

  private onFileSaveAs(): boolean {
    const savefile = dialog.showSaveDialog(this.getBrowserWindow(), {
      title: i18n.__('dialog.saveFlowFile'),
      defaultPath: path.dirname(this.status.currentFile),
      filters: [
        { name: 'flows file', extensions: ['json'] },
        { name: 'ALL', extensions: ['*'] }
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
  };
  
  private onFileClearHistory() {
    this.fileHistory.clear();
  }

  private setFlowFileAndRestart(file: string) {
    if (!this.leavable()) return;
    this.unsetBeforeUnload();
    this.red.setFlowFileAndRestart(file);
  }

  private onUserdirOpen() {
    this.openAny("file://" + this.status.userDir);
  }

  private onLogfileOpen() {
    this.openAny("file://" + log.transports.file.file!);
  }

  private onEndpointLocal() {
    this.openAny(this.red.getHttpUrl());
  };
  
  private onEndpointLocalAdmin() {
    this.openAny(this.red.getAdminUrl());
  };

  private async onNgrokConnect() {
    try {
      const url = await ngrok.connect({proto: "http", addr: this.red.listenPort});
      this.status.ngrokUrl = url;
      this.status.ngrokStarted = true;
      ipcMain.emit("menu:update");
      this.red.notify({
        id: "ngrok",
        payload:{
          type: "success",
          text: "conntcted with " + this.status.ngrokUrl
        },
        retain:false
      }, 15000);
    }catch (err) {
      console.error(err);
      this.red.notify({
        id: "ngrok",
        payload:{
          type: "error",
          text: err.msg + "\n" + err.details.err
        },
        retain:false
      }, 15000);
    }

  };
  private async onNgrokDisconnect() {
    try {
      await ngrok.disconnect(this.status.ngrokUrl);
      await ngrok.disconnect(this.status.ngrokUrl.replace("https://", "http://"));
      ipcMain.emit("menu:update");
      this.red.notify({
        id: "ngrok",
        payload:{
          type: "success",
          text: "disconnected " + this.status.ngrokUrl
        },
        retain:false
      }, 3000);
      this.status.ngrokUrl = "";
    }catch (err) {
      console.error(err);
    }
  };

  private onEndpointPublic() {
    if (this.status.ngrokUrl) this.openAny(this.status.ngrokUrl);
  };

  private onNgrokInspect() {
    if (this.status.ngrokStarted) this.openAny(NGROK_INSPECT_URL);
  };

  private async onViewReload(item: MenuItem, focusedWindow: BrowserWindow) {
    if (focusedWindow) {
      await focusedWindow.loadURL(focusedWindow.webContents.getURL());
      this.setTitle();
    }
  };

  private onSetLocale(item: MenuItem, focusedWindow: BrowserWindow) {
    this.status.locale = item.label;
    if (focusedWindow) {
      const url = this.setLangUrl(focusedWindow.webContents.getURL());
      focusedWindow.loadURL(url);
    }
  };

  private onHelpWeb() {
    shell.openExternal(HELP_WEB_URL);
  };

  private onHelpCheckUpdates() {
    this.myAutoUpdater!.checkUpdates(true);
  };

  private onHelpVersion() {
    const body = `
      Name: ${app.getName()} 
      ${i18n.__('version.version')}: ${app.getVersion()}
      ${this.myAutoUpdater!.info()}
      ${this.red.info()}
      ${this.fileManager.info()}
    `.replace(/^\s*/gm, "");

    dialog.showMessageBox(this.getBrowserWindow(),{
      title: i18n.__('menu.version'),
      type: 'info',
      message: app.getName(),
      detail: body,
      buttons: [i18n.__('dialog.ok')],
      noLink: true
    });
  }

  private onToggleDevTools(item: MenuItem, focusedWindow: BrowserWindow) {
    if (focusedWindow) focusedWindow.webContents.toggleDevTools();
  }

}

const MyApp: BaseApplication = new BaseApplication(app);
