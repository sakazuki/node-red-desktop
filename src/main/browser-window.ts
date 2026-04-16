import { BrowserWindow, session, dialog, shell } from "electron";
import { appEventBus } from "./app-event-bus";
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
    this.window.on("focus", () => { this.onFocus() })
    this.setupSessionHandler();
    this.window.webContents.on("before-input-event", (event, input) => this.onBeforeInput(event, input));
    // Task 4: setWindowOpenHandler replaces the deprecated 'new-window' event.
    // When Ctrl/Meta is held, open in a new Electron window (allow).
    // Otherwise delegate to the OS default browser via shell.openExternal and deny
    // Electron from creating a new BrowserWindow (deny).
    this.window.webContents.setWindowOpenHandler(({ url }) => {
      if (this.ctrlKey) {
        const mw = this.window!.getBounds();
        return {
          action: 'allow' as const,
          overrideBrowserWindowOptions: {
            x: mw.x,
            y: mw.y,
            width: mw.width,
            height: mw.height,
            show: false,
          }
        };
      } else {
        shell.openExternal(url);
        return { action: 'deny' as const };
      }
    });
    this.window.webContents.on('did-create-window', (win) => {
      win.setMenu(null);
      win.setMenuBarVisibility(false);
      win.once('ready-to-show', () => win.show());
      this.ctrlKey = false;
    });
    this.window.webContents.on("dom-ready", () => this.onDomReady());
    this.window.webContents.on("will-prevent-unload", event => this.onBeforeUnload(event));
    this.window.loadURL(url);
    this.ctrlKey = false;
  }

  public getBrowserWindow() {
    return this.window;
  }

  private onFocus() {
    appEventBus.emit("browser:focus");
  }

  private onClose(event: Electron.Event) {
    appEventBus.emit("browser:before-close", event);
  }

  private onClosed() {
    appEventBus.emit("browser:closed");
    this.window = null;
  }

  private onMinimize(event: Electron.Event) {
    appEventBus.emit("browser:minimize", event);
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
    this.ctrlKey = (input.control || input.meta) && (input.type === 'keyDown');
  }

  private onDomReady() {
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
