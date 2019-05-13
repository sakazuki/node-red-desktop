import { autoUpdater, UpdateCheckResult, UpdateInfo } from "electron-updater";
import { BrowserWindow, app, dialog, ipcMain } from "electron";
import log from "./log";
import i18n from "./i18n";
import { AppStatus } from "./main";

export class CustomAutoUpdater {
  private window: BrowserWindow;
  private updateInfo: UpdateInfo | null = null;
  private status: AppStatus;

  constructor(window: BrowserWindow, status: AppStatus) {
    this.window = window;
    this.status = status;
    autoUpdater.logger = log;
    autoUpdater.on("checking-for-update", () => this.onCheckingForUpdate());
    autoUpdater.on("update-available", info => this.onUpdateAvailable(info));
    autoUpdater.on("update-not-available", info =>
      this.onUpdateNotAvaialable(info)
    );
    autoUpdater.on("error", err => this.onError(err));
    autoUpdater.on("download-progress", progressObj =>
      this.onDownloadProgress(progressObj)
    );
    autoUpdater.on("update-downloaded", info => this.onUpdateDownloaded(info));
    if (this.status.autoCheckUpdate) this.checkUpdates(false);
  }

  get autoUpdater() {
    return autoUpdater;
  }

  private onCheckingForUpdate() {
    this.sendStatusToWindow("Checking for update...");
  }

  private onUpdateAvailable(info: UpdateCheckResult) {
    // this.sendStatusToWindow("Update available.");
  }

  private onUpdateNotAvaialable(info: UpdateCheckResult) {
    // this.sendStatusToWindow("Update not available.");
  }

  private onError(err: any) {
    this.sendStatusToWindow("Error in auto-updater. " + err);
  }

  private onDownloadProgress(progressObj: any) {
    const logMessage =
      `Download speed: ${progressObj.bytesPerSecond}` +
      `- Downloaded ${progressObj.percent}% ` +
      `(${progressObj.transferred}/${progressObj.total})`;
    this.sendStatusToWindow(logMessage, true);
  }

  private onUpdateDownloaded(info: UpdateCheckResult) {
    this.sendStatusToWindow("Update downloaded", true);
    this.installUpdate(info);
  }

  private sendStatusToWindow(text: string, silent: boolean = false) {
    log.info(text);
    if (!silent) ipcMain.emit("browser:message", text);
  }

  private installUpdate(info: any) {
    const res = dialog.showMessageBox(this.window, {
      type: "info",
      title: `${app.getName()} v${info.version} ${i18n.__("update.downloaded")}`,
      message: i18n.__("update.message"),
      buttons: [i18n.__("update.restart"), i18n.__("update.later")]
    });
    if (res === 0) {
      ipcMain.emit("browser:restart");
    }
  }

  public quitAndInstall() {
    autoUpdater.quitAndInstall();
  }

  private async onUpdateFround(result: UpdateCheckResult) {
    const res = dialog.showMessageBox(this.window, {
      title: app.getName() + " " + i18n.__("menu.checkversion"),
      type: "info",
      message:
        `v${result.updateInfo.version}(${result.updateInfo.releaseDate}) ${i18n.__("update.available")}`,
      buttons: [i18n.__("update.download"), i18n.__("update.donothing")]
    });
    if (res === 0) {
      await autoUpdater.checkForUpdates();
      await autoUpdater.downloadUpdate();
    }
  }

  private onNoUpdate() {
    dialog.showMessageBox(this.window, {
      title: app.getName() + " " + i18n.__("menu.checkversion"),
      type: "info",
      message: `${i18n.__("update.noavailable")}`,
      buttons: [i18n.__("dialog.ok")],
      noLink: true
    });
  }

  public async checkUpdates(showDialog = true) {
    autoUpdater.autoDownload = this.status.autoDownload;
    autoUpdater.allowPrerelease = this.status.allowPrerelease;
    if (process.env.UPDATE_CHANNEL)
      autoUpdater.channel = process.env.UPDATE_CHANNEL;
    try {
      const result = await autoUpdater.checkForUpdatesAndNotify();
      this.updateInfo = result ? result.updateInfo : null;
      if (result && app.getVersion() < result.updateInfo.version) {
        log.info("update available", result.updateInfo.version);
        await this.onUpdateFround(result);
      } else {
        log.info(
          "update not available",
          result ? result.updateInfo.version : "-"
        );
        if (showDialog) await this.onNoUpdate();
      }
    } catch (err) {
      log.error(err);
    }
  }

  public info() {
    if (!this.updateInfo) return "update uncheked";
    return `
      New Version: ${this.updateInfo.version}
      Release Date: ${this.updateInfo.releaseDate}
      `.replace(/^\s*/gm, "");
  }
}
