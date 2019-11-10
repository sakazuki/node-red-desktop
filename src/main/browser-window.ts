import { BrowserWindow, session, ipcMain, dialog } from "electron";
import i18n from "./i18n";
import log from "./log";

export class CustomBrowserWindow {
  private window: BrowserWindow | null = null;
  private ctrlKey: boolean;

  constructor(options: Electron.BrowserWindowConstructorOptions, url: string) {
    this.window = new BrowserWindow(options);
    this.window.on("close", (event) => { this.onClose(event); });
    this.window.on("closed", () => { this.onClosed(); });
    // @ts-ignore
    this.window.on("minimize", (event) => { this.onMinimize(event); })
    this.setupSessionHandler();
    this.window.webContents.on("before-input-event", (event, input) => this.onBeforeInput(event, input));
    this.window.webContents.on("new-window", (event, url, frameName, disposition, options) => this.onNewWindow(event, url, frameName, disposition, options));
    this.window.webContents.on("dom-ready", event => this.onDomReady(event));
    this.window.webContents.on("will-prevent-unload", event => this.onBeforeUnload(event));
    this.window.loadURL(url);
    this.ctrlKey = false;
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

  private onMinimize(event: Electron.Event) {
    ipcMain.emit("browser:minimize", event);
  }

  private setupSessionHandler() {
    if (!session.defaultSession) throw "session does not exist"
    session.defaultSession.webRequest.onCompleted({ urls: [] }, details => {
      if (details.statusCode == 404) {
        log.log(details);
        // setTimeout(this.window!.webContents.reload, 200);
      }
    })
  }

  private onBeforeInput(event: Electron.Event, input: Electron.Input) {
    // console.log(">>>", input)
    this.ctrlKey = input.control && (input.type === 'keyDown');
  }

  private onNewWindow(event: Electron.Event, url: string, frameName: string, disposition: string, options: any) {
    event.preventDefault();
    if (this.ctrlKey) {
      const mw = this.window!.getBounds();
      const win = new BrowserWindow({
        //@ts-ignore
        webContents: options.webContents,
        x: mw.x,
        y: mw.y,
        width: mw.width,
        height: mw.height,
        show: false
      });
      win.once('ready-to-show', () => win.show())
      if (!options.webContents) {
        win.loadURL(url);
      }
      win.setMenu(null);
      win.setMenuBarVisibility(false);
      //@ts-ignore
      event.newGuest = win;
      this.ctrlKey = false;
    } else {
      ipcMain.emit("window:new", url);
    }
  }

  private onDomReady(event: Electron.Event) {
    this.window!.webContents.send("editor:start");
  }

  private onBeforeUnload(event: Electron.Event){
    const choice = dialog.showMessageBoxSync(this.window!, {
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
