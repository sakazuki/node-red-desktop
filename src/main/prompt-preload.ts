import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("promptApi", {
  onInit: (callback: (data: { label: string; value: string }) => void) => {
    ipcRenderer.on("prompt:init", (_event, data) => callback(data));
  },
  submit: (value: string | null) => {
    ipcRenderer.send("prompt:result", value);
  }
});
