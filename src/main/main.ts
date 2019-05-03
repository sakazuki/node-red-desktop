import { app, App, BrowserWindowConstructorOptions, ipcMain, MenuItem, BrowserWindow, dialog, shell } from "electron";
import { MyBrowserWindow } from "./browserwindow";
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

const FILE_HISTORY_SIZE = 10;
const HELP_WEB_URL = "https://electron.atom.io";
const NGROK_INSPECT_URL = "http://localhost:4040";

export interface AppStatus {
  editorEnabled: boolean;
  ngrokUrl: string;
  ngrokStarted: boolean;
  modified: boolean;
  langEnUS: boolean;
  currentFile: string;
}

class BaseApplication {
  private mainWindow: MyBrowserWindow | null = null;
  private myAutoUpdater: MyAutoUpdater | null = null;
  private appMenu: AppMenu | null = null;
  private tray: MyTray | null = null;
  private app: App;
  private mainURL: string = path.join(__dirname, "..", "index.html");
  private loadingURL: string = path.join(__dirname, "..", "loading.html");
  private config: ConfigManager;
  private fileManager: FileManager;
  private fileHistory: FileHistory;
  private status: AppStatus;

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
      langEnUS: false,
      currentFile: ''
    };
    this.appMenu = new AppMenu(this.status, this.fileHistory);
    ipcMain.on("browser:show", () => this.getBrowserWindow().show());
    ipcMain.on("browser:before-close", (event: Electron.Event) => this.onBeforeClose(event));
    ipcMain.on("browser:closed", this.onClosed.bind(this));
    ipcMain.on("browser:restart", this.onRestart.bind(this));
    ipcMain.on("browser:message", (text: string) => this.onMessage(text));
    ipcMain.on("history:update", this.updateMenu.bind(this));
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
    ipcMain.on("endpoint:local", this.onEndpointLocal.bind(this));
    ipcMain.on("endpoint:local-admin", this.onEndpointLocalAdmin.bind(this));
    ipcMain.on("endpoint:public", this.onEndpointPublic.bind(this));
    ipcMain.on("ngrok:connect", this.onNgrokConnect.bind(this));
    ipcMain.on("ngrok:disconnect", this.onNgrokDisconnect.bind(this));
    ipcMain.on("ngrok:inspect", this.onNgrokInspect.bind(this));
    ipcMain.on("view:reload", (item: MenuItem, focusedWindow: BrowserWindow) => this.onViewReload(item, focusedWindow));
    ipcMain.on("view:lang-en", (item: MenuItem, focusedWindow: BrowserWindow) => this.onViewLangEn(item, focusedWindow));
    ipcMain.on("help:web", this.onHelpWeb.bind(this));
    ipcMain.on("help:check-updates", this.onHelpCheckUpdates.bind(this));
    ipcMain.on("help:version", this.onHelpVersion.bind(this));
    ipcMain.on("dev:tools", (item: MenuItem, focusedWindow: BrowserWindow) => this.onToggleDevTools(item, focusedWindow));
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
    this.mainWindow = new MyBrowserWindow(options, this.mainURL);
    this.fileHistory.load(this.config.data.recentFiles);
  }

  private onReady() {
    this.create();
    this.myAutoUpdater = new MyAutoUpdater(this.getBrowserWindow());
    this.myAutoUpdater.checkUpdates(false);
    this.tray = new MyTray();
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
    this.config.save();
  }

  private usingTmpFile() {
    return this.fileManager.test(this.status.currentFile);
  }

  private confirmClose(): boolean {
    if (!this.status.modified) return true;
    const res = dialog.showMessageBox({
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
    if (this.confirmClose()) {
      this.saveConfig();
    } else {
      if (event) event.preventDefault();
    }
  }

  private onClosed() {
    this.fileManager.clearTmp();
  }

  private onRestart() {
    this.onBeforeClose();
  }

  private setLangUrl(url: string){
    let current = urlparse.parse(url);
    current.search = this.status.langEnUS ? "?setLng=en-US" : "";
    return urlparse.format(current);
  }

  private onMessage(text: string) {
    this.getBrowserWindow().webContents.send("message", text);
  }

  private onSignIn(event: Electron.Event, args: any) {
  }

  private onSignedIn(event: Electron.Event, args: any) {
  }

  private onEditorStarted(event: Electron.Event, args: any) {
    this.status.editorEnabled = true;
  }

  private onNodesChange(event: Electron.Event, args: any) {
    this.status.modified = args.dirty;
    //TODO: newfile_changed handling
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
    this.status.currentFile = this.fileManager.createTmp(__dirname);
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
      // openFlowFile(files[0]);
      this.status.currentFile = file;
    }
  };

  private onFileSave(): boolean {
    this.getBrowserWindow().webContents.send("editor:deploy");
    return true;
  };

  private onFileSaveAs(): boolean {
    if (this.status.modified) this.onFileSave();
    const savefile = dialog.showSaveDialog(this.getBrowserWindow(), {
      title: i18n.__('dialog.saveFlowFile'),
      defaultPath: path.dirname(this.status.currentFile),
      filters: [
        { name: 'flows file', extensions: ['json'] },
        { name: 'ALL', extensions: ['*'] }
      ]
    });
    if (!savefile) return false;
    this.fileManager.saveAs(this.status.currentFile, savefile);
    this.fileHistory.add(savefile);
    this.status.currentFile = savefile;
    return true;
  };
  
  private onFileClearHistory() {
    this.fileHistory.clear();
  }

  private onEndpointLocal() {};
  
  private onEndpointLocalAdmin() {};

  private async onNgrokConnect() {
    try {
      const url = await ngrok.connect();
      this.status.ngrokUrl = url;
      this.status.ngrokStarted = true;
      this.updateMenu();
    }catch (err) {
      console.error(err);
    }

  };
  private async onNgrokDisconnect() {
    try {
      await ngrok.disconnect(this.status.ngrokUrl);
      await ngrok.disconnect(this.status.ngrokUrl.replace("https://", "http://"));
      this.status.ngrokUrl = "";
      this.updateMenu();
    }catch (err) {
      console.error(err);
    }
  };
  private onEndpointPublic() {
    this.openAny(this.status.ngrokUrl);
  };
  private onNgrokInspect() {
    this.openAny(NGROK_INSPECT_URL);
  };

  private onViewReload(item: MenuItem, focusedWindow: BrowserWindow) {
    if (focusedWindow) focusedWindow.reload();
  };

  private onViewLangEn(item: MenuItem, focusedWindow: BrowserWindow) {
    if (focusedWindow) {
      this.status.langEnUS = item.checked;
      let url = this.setLangUrl(focusedWindow.webContents.getURL());
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
    dialog.showMessageBox(this.getBrowserWindow(),{
      title: i18n.__('menu.version'),
      type: 'info',
      message: app.getName(),
      detail: `${i18n.__('version.version')}: ${app.getVersion()}`,
      buttons: [i18n.__('dialog.ok')],
      noLink: true
    });
  }

  private onToggleDevTools(item: MenuItem, focusedWindow: BrowserWindow) {
    if (focusedWindow) focusedWindow.webContents.toggleDevTools();
  }

}

const MyApp: BaseApplication = new BaseApplication(app);
