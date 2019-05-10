import { autoUpdater, UpdateCheckResult, UpdateInfo } from "electron-updater";
import { BrowserWindow, app, dialog, ipcMain } from "electron";
import log from "./log";
import i18n from "./i18n";
import path from "path";

export class CustomAutoUpdater {
  private window: BrowserWindow;
  private updateInfo: UpdateInfo | null = null;

  constructor(window: BrowserWindow) {
    this.window = window;
    autoUpdater.logger = log;
    autoUpdater.allowPrerelease = true;
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
    ipcMain.emit("browser:message", text);
  }

  private installUpdate(info: any) {
    dialog.showMessageBox(this.window, {
      type: "info",
      title: `${app.getName()} v${info.version} ${i18n.__("update.downloaded")}`,
      message: i18n.__("update.message"),
      buttons: [i18n.__("update.restart"), i18n.__("update.later")]
    }, function(res) {
        if (res == 0){
          ipcMain.emit("browser:restart");
        }
    })
  }

  public quitAndInstall() {
    autoUpdater.quitAndInstall();
  }

  private onUpdateFround(result: UpdateCheckResult) {
    dialog.showMessageBox(this.window, {
      title: app.getName() + ' ' + i18n.__('menu.checkversion'),
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
    dialog.showMessageBox(this.window, {
      title: app.getName() + ' ' + i18n.__('menu.checkversion'),
      type: 'info',
      message: `Current version is latest`,
      detail: `${i18n.__('update.noavailable')}`,
      buttons: [i18n.__('dialog.ok')],
      noLink: true
    });
  }

  public async checkUpdates(showDialog = true) {
    autoUpdater.autoDownload = false;
    if (process.env.UPDATE_CHANNEL)  autoUpdater.channel = process.env.UPDATE_CHANNEL;
    try {
      const result = await autoUpdater.checkForUpdatesAndNotify();
      this.updateInfo = result ? result.updateInfo : null;
      if (result && (app.getVersion() < result.updateInfo.version)){
        log.info('update available', result.updateInfo.version);
        this.onUpdateFround(result);
      }else{
        log.info('update not available', result ? result.updateInfo.version : "-" );
        if (showDialog) this.onNoUpdate();
      }
    } catch (err) {
      log.error(err);
    }
  }

  public info() {
    if (!this.updateInfo) return 'update uncheked';
    return `
      New Version: ${this.updateInfo.version}
      Release Date: ${this.updateInfo.releaseDate}
      `.replace(/^\s*/gm, "");
  }
}
