import { BrowserWindow, session, ipcMain, dialog } from "electron";
import i18n from "./i18n";

export class CustomBrowserWindow {
  private window: BrowserWindow | null = null;

  constructor(options: Electron.BrowserWindowConstructorOptions, url: string) {
    this.window = new BrowserWindow(options);
    this.window.on("close", (event) => { this.onClose(event); });
    this.window.on("closed", () => { this.onClosed(); });
    this.setupSessionHandler();
    this.window.webContents.on("new-window", (event, url) => this.onNewWindow(event, url));
    this.window.webContents.on("dom-ready", event => this.onDomReady(event));
    this.window.webContents.on("will-prevent-unload", event => this.onBeforeUnload(event));
    this.window.loadURL(url);
  }

  public getBrowserWindow() {
    return this.window;
  }

  private onClose(event: Electron.Event) {
    ipcMain.emit("browser:before-close", event);
  }

  private onClosed() {
    ipcMain.emit("browser:closed");
    this.window = null;
  }

  private setupSessionHandler() {
    if (!session.defaultSession) throw "session does not exist"
    session.defaultSession.webRequest.onCompleted({ urls: [] }, details => {
      if (details.statusCode == 404) {
        console.log(details);
        // setTimeout(this.window!.webContents.reload, 200);
      }
    })
  }

  private onNewWindow(event: Electron.Event, url: string) {
    ipcMain.emit("window:new", url);
    event.preventDefault();
  }

  private onDomReady(event: Electron.Event) {
    this.window!.webContents.send("editor:start");
  }

  private onBeforeUnload(event: Electron.Event){
    const choice = dialog.showMessageBox(this.window!, {
      type: "question",
      buttons: [i18n.__("dialog.yes"), i18n.__("dialog.no")],
      title: i18n.__("dialog.confirm"),
      message: i18n.__("dialog.unloadMsg"),
      defaultId: 1,
      cancelId: 1
    });
    if (choice == 0) {
      event.preventDefault();
    }
  }

}
