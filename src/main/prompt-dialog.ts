import { BrowserWindow, ipcMain, app } from "electron";
import path from "path";
import { pathToFileURL } from "url";

export interface PromptOptions {
  width?: number;
  height?: number;
  resizable?: boolean;
  title?: string;
  label?: string;
  value?: string;
  minimizable?: boolean;
  maximizable?: boolean;
}

export function showInputPrompt(options: PromptOptions, parentWindow: BrowserWindow): Promise<string | null> {
  return new Promise((resolve) => {
    const dialogWindow = new BrowserWindow({
      width: Math.round(options.width ?? 400),
      height: options.height ?? 200,
      resizable: options.resizable ?? false,
      title: options.title ?? app.name,
      parent: parentWindow,
      modal: true,
      minimizable: options.minimizable ?? false,
      maximizable: options.maximizable ?? false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "prompt-preload.js")
      }
    });

    dialogWindow.setMenu(null);
    dialogWindow.setMenuBarVisibility(false);

    const initData = {
      label: options.label ?? "",
      value: options.value ?? ""
    };

    let resolved = false;

    const onResult = (_event: Electron.IpcMainEvent, value: string | null) => {
      if (!resolved) {
        resolved = true;
        resolve(value);
      }
      ipcMain.removeListener("prompt:result", onResult);
      if (!dialogWindow.isDestroyed()) dialogWindow.close();
    };

    ipcMain.on("prompt:result", onResult);

    dialogWindow.once("closed", () => {
      ipcMain.removeListener("prompt:result", onResult);
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    });

    dialogWindow.once("ready-to-show", () => {
      dialogWindow.show();
      dialogWindow.webContents.send("prompt:init", initData);
    });

    const promptHtmlPath = pathToFileURL(path.join(__dirname, "..", "prompt.html")).href;
    dialogWindow.loadURL(promptHtmlPath);
  });
}
