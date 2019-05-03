import fs from "fs-extra";
import {IpcMain} from "electron";

export class FileHistory {
  public history: Array<string> = [];
  private size: number;
  private ipcMain: IpcMain;
  constructor(size: number = 10, ipcMain: IpcMain) {
    this.size = size;
    this.ipcMain = ipcMain;
  }
  public update() {
    this.ipcMain.emit("history:update");
  }
  public add(path: string, update = true) {
    const i = this.history.indexOf(path);
    if (i > -1) this.history.splice(i, 1);
    this.history.unshift(path);
    this.history.splice(this.size);
    if (update) this.update();
  }
  public load(data: Array<string>) {
    this.clear();
    if (data) {
      data.reverse().forEach(v => {
        if (fs.existsSync(v)) this.add(v, false);
      });
    }
    this.update();
    return this.history;
  }
  public clear() {
    this.history.splice(0);
    this.update();
  }
}