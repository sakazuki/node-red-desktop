import { app, Menu, Tray, ipcMain } from "electron";
import path from "path";
import i18n from "./i18n";
import { NodeREDApp } from "./node-red";

export class CustomTray {
  private tray: Tray;
  private red: NodeREDApp;
  constructor(red: NodeREDApp) {
    this.red = red;
    const iconFile = (process.platform === "darwin") ? "iconTemplate.png" : "node-red-tray.png";
    this.tray = new Tray(path.join(__dirname, "..", "images", iconFile));
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click() { ipcMain.emit("browser:show"); }
      },
      {
        label: 'Hide App',
        click() { ipcMain.emit("browser:hide"); }
      },
      { type: "separator" },
      {
        label: i18n.__("menu.openLocalURL"),
        click() { ipcMain.emit("endpoint:local"); }
      }, 
      {
        label: i18n.__("menu.openLocalAdminURL"),
        click() { ipcMain.emit("endpoint:local-admin"); }
      },
      {
        label: i18n.__("menu.openPublicURL"),
        click() { ipcMain.emit("endpoint:public"); }
      }, 
      {
        label: i18n.__("menu.openNgrokInspect"),
        click() { ipcMain.emit("ngrok:inspect"); }
      },
      { type: "separator" },
      {
        label: i18n.__("menu.quit"), role: "quit"
      }
    ])
    this.tray.setToolTip(`${app.name}(port:${this.red.listenPort})`);
    this.tray.setContextMenu(contextMenu);
    this.tray.on("double-click", this.onShow.bind(this));
  }
  private onShow() {
    ipcMain.emit("browser:show");
  }
  public destroy() {
    this.tray.destroy();
  }
}