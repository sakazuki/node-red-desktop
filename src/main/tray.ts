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
        label: i18n.__("menu.quit"), role: "quit"
      },
      { label: 'Item3', type: 'radio', checked: true },
      { label: 'Item4', type: 'radio' }
    ])
    this.tray.setToolTip(`This is ${app.getName()}`);
    this.tray.setContextMenu(contextMenu);
  }
}