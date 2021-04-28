import { contextBridge, ipcRenderer } from 'electron'
import { IpcRendererEvent } from 'electron/main'
import _i18n from "./i18n";

contextBridge.exposeInMainWorld('NRDApi', {
  sendNodesChange: async (state: any) => {
    return ipcRenderer.send("nodes:change", state);
  },
  sendViewSelectionChanged: async (selection: any) => {
    return ipcRenderer.send("view:selection-changed", selection);
  },
  sendEditorStarted: async () => {
    return ipcRenderer.send("editor:started");
  },
  sendSettingsLoaded: async () => {
    return ipcRenderer.send("settings:loaded")
  },
  sendSettingsUpdate: (data: any) => {
    return ipcRenderer.send("settings:update", data)
  },
  sendSettingsCancel: () => {
    return ipcRenderer.send("settings:cancel")
  },
  setLocale: (locale: string) => {
    _i18n.setLocale(locale);
  },
  t: (key: string): string => {
    return _i18n.__(key)
  },
  onSettingsSet: (listener: (event: IpcRendererEvent, settings: any) => void) => {
    ipcRenderer.on("settings:set", listener)
  },
  onForceReload: (listener: () => void) => {
    ipcRenderer.on("force:reload", listener)
  },
  onEditorDeploy: (listener: (event: IpcRendererEvent, message: string) => void) => {
    ipcRenderer.on("editor:deploy", listener)
  },
  onEditorStart: (listener: (event: IpcRendererEvent, message: string) => void) => {
    ipcRenderer.on("editor:start", listener)
  },
  onShadeShow: (listener: (event: IpcRendererEvent, message: string) => void) => {
    ipcRenderer.on("shade:show", listener)
  },
  onShadeStart: (listener: (event: IpcRendererEvent, message: string) => void) => {
    ipcRenderer.on("shade:start", listener)
  },
  onShadeEnd: (listener: (event: IpcRendererEvent, message: string) => void) => {
    ipcRenderer.on("shade:end", listener)
  },
  onShadeHide: (listener: (event: IpcRendererEvent, message: string) => void) => {
    ipcRenderer.on("shade:hide", listener)
  },
  onRedNotify: (listener: (event: IpcRendererEvent, message: string) => void) => {
    ipcRenderer.on("red:notify", listener)
  },
});

declare global {
  interface Window {
    NRDApi: NRDApi;
  }
}

export type NRDApi = {
  sendNodesChange: (state: any) => Promise<void>
  sendViewSelectionChanged: (selection: any) => Promise<void>
  sendEditorStarted: () => Promise<void>
  sendSettingsLoaded: () => Promise<void>
  sendSettingsUpdate: (data: any) => Promise<void>
  sendSettingsCancel: () => Promise<void>
  setLocale: (locale: string) => void
  t: (key: string) => string
  onSettingsSet: (listener: (event: IpcRendererEvent, settings: any) => void) => void
  onForceReload: (listener: () => void) => void
  onEditorDeploy: (listener: (event: IpcRendererEvent, message: string) => void) => void
  onEditorStart: (listener: (event: IpcRendererEvent, message: string) => void) => void
  onShadeShow: (listener: (event: IpcRendererEvent, message: string) => void) => void
  onShadeStart: (listener: (event: IpcRendererEvent, message: string) => void) => void
  onShadeEnd: (listener: (event: IpcRendererEvent, message: string) => void) => void
  onShadeHide: (listener: (event: IpcRendererEvent, message: string) => void) => void
  onRedNotify: (listener: (event: IpcRendererEvent, type: string, message: string, timeout: number) => void) => void
}
