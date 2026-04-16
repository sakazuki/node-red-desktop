import { EventEmitter } from 'events';
import { MenuItem, BaseWindow } from 'electron';

interface AppEventMap {
  // Browser window lifecycle (from browser-window.ts)
  'browser:focus': [];
  'browser:before-close': [event: Electron.Event];
  'browser:closed': [];
  'browser:minimize': [event: Electron.Event];
  'browser:show': [];
  'browser:hide': [];
  'browser:relaunch': [];

  // Browser navigation (from node-red.ts)
  'browser:loading': [];
  'browser:go': [url: string];
  'browser:update-title': [];

  // Auto-update events (from auto-update.ts)
  'browser:progress': [progress: number];
  'browser:message': [text: string];
  'browser:restart': [];

  // Internal bus (from main.ts, file-history.ts)
  'history:update': [];
  'menu:update': [];

  // File operations (from menu.ts)
  'file:new': [];
  'file:open': [filePath?: string];
  'file:save': [];
  'file:save-as': [];
  'file:open-userdir': [];
  'file:open-logfile': [];
  'file:clear-recent': [];

  // Settings (from menu.ts)
  'settings': [];

  // Endpoint operations (from menu.ts / tray.ts)
  'endpoint:local': [];
  'endpoint:local-admin': [];
  'endpoint:public': [];
  'ngrok:connect': [];
  'ngrok:disconnect': [];
  'ngrok:inspect': [];

  // Node operations (from menu.ts)
  'node:addLocal': [];
  'node:addRemote': [];

  // View operations (from menu.ts)
  // Note: Electron v34 changed MenuItem.click's focusedWindow type from BrowserWindow to BaseWindow
  'view:reload': [item: MenuItem, focusedWindow: BaseWindow | undefined];
  'view:set-locale': [item: MenuItem, focusedWindow: BaseWindow | undefined];

  // Help (from menu.ts)
  'help:node-red': [];
  'help:node-red-desktop': [];
  'help:author': [];
  'help:check-updates': [];
  'help:version': [];

  // Dev tools (from menu.ts)
  'dev:tools': [item: MenuItem, focusedWindow: BaseWindow | undefined];

  // Dialog (from node-red.ts)
  'dialog:show': [type: 'success' | 'error' | 'info', message: string, timeout?: number];
}

class AppEventBus extends EventEmitter {
  emit<K extends keyof AppEventMap>(event: K, ...args: AppEventMap[K]): boolean {
    return super.emit(event as string, ...args);
  }
  on<K extends keyof AppEventMap>(event: K, listener: (...args: AppEventMap[K]) => void): this {
    return super.on(event as string, listener as (...args: any[]) => void);
  }
}

export const appEventBus = new AppEventBus();
