import { autoUpdater, UpdateCheckResult } from "electron-updater";
import { BrowserWindow, app, dialog, ipcMain } from "electron";
import { MyBrowserWindow } from "./browserwindow";
import log from "./log";
import i18n from "./i18n";
import path from "path";

export class MyAutoUpdater {
  private window: BrowserWindow | null = null;

  constructor(win: MyBrowserWindow) {
    this.window = win.getBrowserWindow();
    autoUpdater.logger = log;

    autoUpdater.on("checking-for-update", _ => this.onCheckingForUpdate());
    autoUpdater.on("update-available", (info) => this.onUpdateAvailable(info));
    autoUpdater.on("update-not-available", (info) => this.onUpdateNotAvaialable(info));
    autoUpdater.on("error", (err) => this.onError(err));
    autoUpdater.on("download-progress", (progressObj) => this.onDownloadProgress(progressObj));
    autoUpdater.on("update-downloaded", (info) => this.onUpdateDownloaded(info));
  }

  private onCheckingForUpdate(){
    this.sendStatusToWindow("Checking for update...");
  }

  private onUpdateAvailable(info: UpdateCheckResult) {
    this.sendStatusToWindow("Update available.");
  }

  private onUpdateNotAvaialable(info: UpdateCheckResult) {
    this.sendStatusToWindow("Update not available.");
  }

  private onError(err: any) {
    this.sendStatusToWindow("Error in auto-updater. " + err);
  }

  private onDownloadProgress(progressObj: any) {
    const log_message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`
    this.sendStatusToWindow(log_message);
  }

  private onUpdateDownloaded(info: UpdateCheckResult) {
    this.sendStatusToWindow("Update downloaded");
    this.installUpdate(info);
  }

  private sendStatusToWindow(text: string) {
    log.info(text);
    this.window!.webContents.send("message", text);
  }

  private installUpdate(info: any) {
    dialog.showMessageBox(this.window!, {
      type: "info",
      title: `v${info.version} ${i18n.__("update.downloaded")}`,
      message: i18n.__("update.message"),
      buttons: [i18n.__("update.restart"), i18n.__("update.later")]
    }, function(res) {
        if (res == 0){
          ipcMain.emit("browser:restart");
        }
    })
  }

  private onUpdateFround(result: UpdateCheckResult) {
    dialog.showMessageBox(this.window!, {
      title: i18n.__('menu.checkversion'),
      type: "info",
      message: `v${result.updateInfo.version}(${result.updateInfo.releaseDate}) ${i18n.__('update.available')}`,
      buttons: [i18n.__('update.download'), i18n.__('update.donothing')]
    }, function(res){
      if (res == 0){
        autoUpdater.downloadUpdate();
      }
    });
  }

  private onNoUpdate() {
    dialog.showMessageBox(this.window!, {
      title: i18n.__('menu.checkversion'),
      type: 'info',
      message: `Current version is latest`,
      detail: `${i18n.__('update.noavailable')}`,
      buttons: [i18n.__('dialog.ok')],
      noLink: true
    }, function(res){});
  }

  public async checkUpdates(showDialog = true) {
    autoUpdater.autoDownload = false;
    autoUpdater.updateConfigPath = path.join(__dirname, "..", "dev.yml");
    autoUpdater.channel = "dev";
    const result = await autoUpdater.checkForUpdatesAndNotify();
    if (result && (app.getVersion() < result.updateInfo.version)){
      log.info('update available', result.updateInfo.version);
      this.onUpdateFround(result);
    }else{
      log.info('update not available', result ? result.updateInfo.version : "-" );
      if (showDialog) this.onNoUpdate();
    }
  }

  public checkForUpdatesAndNotify() {
    autoUpdater.checkForUpdatesAndNotify();
  }

}
