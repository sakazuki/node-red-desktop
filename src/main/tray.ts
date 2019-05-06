import { app, Menu, Tray, ipcMain } from "electron";
import path from "path";
import i18n from "./i18n";

export class MyTray {
  private tray: Tray;
  constructor() {
    this.tray = new Tray(path.join(__dirname, "..", "images", "tray.ico"));
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
    this.tray.setToolTip(`This is ${app.getName()}`);
    this.tray.setContextMenu(contextMenu);
    this.tray.on("double-click", this.onShow.bind(this));
  }
  private onShow() {
    ipcMain.emit("browser:show");
  }
}