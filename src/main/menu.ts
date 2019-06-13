import { app, Menu, MenuItemConstructorOptions, ipcMain, MenuItem} from "electron";
import i18n from "./i18n";
import { FileHistory } from "./file-history";
import { AppStatus } from "./main";

const macOS = process.platform === "darwin";

export class AppMenu {
  private status: AppStatus;
  private fileHistory: FileHistory;
  private _enabled: boolean;

  constructor(status: AppStatus, fileHistory: FileHistory) {
    this.status = status;
    this.fileHistory = fileHistory;
    this._enabled = true;
  }

  get enabled() { return this._enabled; }

  set enabled(value) {
    if (this._enabled === value) return;
    this._enabled = value;
    this.setup();
  }

  private fileUsable() {
    return this.enabled && this.status.editorEnabled && !this.status.projectsEnabled
  }

  private editorUsable() {
    return this.enabled && this.status.editorEnabled
  }

  public setup(){
    const file: MenuItemConstructorOptions ={
      label: i18n.__("menu.file"),
      submenu: [
        {
          label: i18n.__("menu.new"),
          enabled: this.fileUsable(),
          accelerator: "CmdOrCtrl+N",
          click() { ipcMain.emit("file:new"); }
        },
        {
          label: i18n.__("menu.open") + "...",
          enabled: this.fileUsable(),
          accelerator: "CmdOrCtrl+O",
          click() { ipcMain.emit("file:open"); }
        },
        {
          label: i18n.__("menu.openRecent") + "...",
          enabled: false,
          submenu: [],
        },
        { type: "separator"},
        {
          label: i18n.__("menu.saveDeploy"),
          enabled: this.editorUsable(),
          accelerator: "CmdOrCtrl+S",
          click() { ipcMain.emit("file:save"); }
        },
        {
          label: i18n.__("menu.saveAsDeploy") + "...",
          enabled: this.fileUsable(),
          accelerator: "Shift+CmdOrCtrl+S",
          click() { ipcMain.emit("file:save-as"); }
        },
        { type: 'separator'},
        {
          label: i18n.__('menu.settings') + "...",
          enabled: this.enabled,
          click() { ipcMain.emit("settings"); }
        },
        { type: 'separator'},
        {
          label: i18n.__('menu.openUserDir'),
          enabled: true,
          click() { ipcMain.emit("file:open-userdir"); }
        },
        {
          label: i18n.__('menu.openLogFile'),
          enabled: true,
          click() { ipcMain.emit("file:open-logfile"); }
        },
        { type: "separator"},
        {
          label: i18n.__("menu.relaunch"),
          enabled: this.editorUsable(),
          click() { ipcMain.emit("browser:relaunch"); }
        },
        { type: "separator"},
        { label: i18n.__("menu.quit"), role: "quit" }
      ]
    };
    if (macOS) {
      //@ts-ignore
      file.submenu.splice(-4);
      //@ts-ignore
      file.submenu.splice(-5, 2);
    };

    const edit: MenuItemConstructorOptions = {
      label: i18n.__("menu.edit"),
      submenu: [
        { label: i18n.__("menu.undo"), role: "undo" },
        { label: i18n.__("menu.redo"), role: "redo" },
        { type: "separator" },
        { label: i18n.__("menu.cut"), role: "cut" },
        { label: i18n.__("menu.copy"), role: "copy" },
        { label: i18n.__("menu.paste"), role: "paste" },
        { label: i18n.__("menu.pasteandmatchstyle"), role: "pasteandmatchstyle" },
        { label: i18n.__("menu.delete"), role: "delete" },
        { label: i18n.__("menu.selectall"), role: "selectall" }
      ]
    };
  
    const endpoint: MenuItemConstructorOptions = {
      label: i18n.__("menu.endpoint"),
      submenu: [
        {
          label: i18n.__("menu.openLocalURL"),
          enabled: this.editorUsable(),
          click() { ipcMain.emit("endpoint:local"); }
        }, 
        {
          label: i18n.__("menu.openLocalAdminURL"),
          enabled: this.editorUsable(),
          click() { ipcMain.emit("endpoint:local-admin"); }
        },
        { type: "separator" },
        {
          label: i18n.__("menu.ngrokConnect"),
          enabled: this.enabled && (this.status.ngrokUrl.length === 0),
          click() { ipcMain.emit("ngrok:connect"); }
        },
        {
          label: i18n.__("menu.ngrokDisconnect"),
          enabled: this.enabled && (this.status.ngrokUrl.length > 0),
          click() { ipcMain.emit("ngrok:disconnect") }
        }, 
        {
          label: i18n.__("menu.openPublicURL"),
          enabled: this.enabled && (this.status.ngrokUrl.length > 0),
          click() { ipcMain.emit("endpoint:public"); }
        }, 
        {
          label: i18n.__("menu.openNgrokInspect"),
          enabled: this.enabled && this.status.ngrokStarted,
          click() { ipcMain.emit("ngrok:inspect"); }
        } 
      ]
    };

    const tools: MenuItemConstructorOptions = {
      label: i18n.__("menu.tools"),
      submenu: [
        {
          label: i18n.__("menu.addLocalNode") + "...",
          enabled: this.enabled,
          click() { ipcMain.emit("node:addLocal"); }
        },
        {
          label: i18n.__("menu.addRemoteNode") + "...",
          enabled: this.enabled,
          click() { ipcMain.emit("node:addRemote"); }
        },
        { type: "separator"},
        {
          label: i18n.__("menu.nodegen"),
          enabled: this.enabled,
          click() { ipcMain.emit("node:nodegen"); }
        }
      ]
    };
  
    const view: MenuItemConstructorOptions = {
      label: i18n.__("menu.view"),
      submenu: [
        {
          label: i18n.__("menu.reload"),
          enabled: this.enabled,
          accelerator: "CmdOrCtrl+R",
          click(item, focusedWindow) { ipcMain.emit("view:reload", item, focusedWindow); }
        },
        { type: "separator" },
        {
          label: i18n.__("menu.locales") + "...",
          enabled: this.enabled,
          submenu: [],
        },
        { type: "separator" },
        {
          label: i18n.__("menu.togglefullscreen"),
          enabled: this.enabled,
          role: "togglefullscreen"
        },
        {
          label: i18n.__("menu.minimize"),
          enabled: this.enabled,
          role: "minimize"
        }
      ]
    };
    if (macOS) {
      const viewMac = [
        { type: "separator" },
        {
          label: i18n.__("menu.resetzoom"),
          enabled: this.enabled,
          role: "resetzoom"
        },
        { 
          label: i18n.__("menu.zoomin"),
          enabled: this.enabled,
          role: "zoomin"
        },
        { 
          label: i18n.__("menu.zoomout"),
          enabled: this.enabled,
          role: "zoomout"
        }
      ];
      //@ts-ignore
      view.submenu.splice(-3, 0, ...viewMac);
    };

    const help: MenuItemConstructorOptions = {
      label: i18n.__("menu.help"),
      submenu: [
        {
          label: "Node-RED",
          enabled: this.enabled,
          click() { ipcMain.emit("help:node-red"); }
        },
        {
          label: "Node-RED-Desktop",
          enabled: this.enabled,
          click() { ipcMain.emit("help:node-red-desktop"); }
        },
        // {
        //   label: "Author",
        //   click() { ipcMain.emit("help:author"); }
        // },
        { type: "separator" },
        {
          label: i18n.__("menu.checkversion") + "...",
          enabled: this.enabled,
          click() { ipcMain.emit("help:check-updates"); }
        },
        {
          label: i18n.__("menu.version"),
          enabled: this.enabled,
          click() { ipcMain.emit("help:version"); }
        }
      ]
    };
    if (macOS) {
      //@ts-ignore
      help.submenu.splice(-1);
    };

    const dev: MenuItemConstructorOptions = {
      label: "Dev",
      submenu: [
        {   
          label: "Toggle Developer Tools",
          accelerator: "Ctrl+Shift+I",
          click(item, focusedWindow) { ipcMain.emit("dev:tools", item, focusedWindow); }
        }
      ]
    };
    if (macOS) {
      //@ts-ignore
      dev.submenu[0].accelerator = "Alt+Command+I";
    }
  
    const darwin: MenuItemConstructorOptions = {
      label: app.getName(),
      submenu: [
        {
          label: i18n.__('menu.about'),
          enabled: this.enabled,
          click() { ipcMain.emit("help:version"); }
        },
        { type: 'separator'},
        {
          label: i18n.__('menu.settings') + "...",
          enabled: this.enabled,
          accelerator: 'Command+,',
          click() { ipcMain.emit("settings"); }
        },
        { type: "separator" },
        { role: "services", submenu: []},
        { type: "separator" },
        { label: i18n.__('menu.hide'), role: 'hide'},
        { label: i18n.__('menu.hideothers'), role: 'hideothers'},
        { label: i18n.__('menu.unhide'), role: 'unhide'},
        { type: 'separator'},
        {
          label: i18n.__("menu.relaunch"),
          click() { ipcMain.emit("browser:relaunch"); }
        },
        { type: "separator"},
        { label: i18n.__('menu.quit'), role: 'quit' }
      ]
    };
  
    let template: MenuItemConstructorOptions[];
    let openRecentMenu: Menu | any;
    let localesMenu: Menu | any;
  
    if (macOS) {
      template = [darwin, file, edit, endpoint, tools, view, help];
    } else {
      template = [file, endpoint, tools, view, help];
    }
  
    if (new RegExp(`${app.getName()}-debug`).exec(process.env.NODE_DEBUG!)) {
      template.push(dev);
    };
  
    const menu = Menu.buildFromTemplate(template);
    if (macOS) {
      openRecentMenu = (menu.items[1] as any).submenu.items[2];
      localesMenu = (menu.items[5] as any).submenu.items[2];
    } else {
      openRecentMenu = (menu.items[0] as any).submenu.items[2];
      localesMenu = (menu.items[3] as any).submenu.items[2];
    }
    this.setOpenRecentMenu(openRecentMenu.submenu);
    openRecentMenu.enabled = (openRecentMenu.submenu.items.length > 0);
    this.setLocalesMenu(localesMenu.submenu);
    Menu.setApplicationMenu(menu);
  }

  private setOpenRecentMenu(openRecentMenu: Menu): void {
    const files = this.fileHistory.history;
    if (files.length > 0){
      for(let i = 0; i < files.length; i++){
        if (!files[i]) continue;
        openRecentMenu.append(
          new MenuItem({
            label: files[i],
            enabled: this.fileUsable(),
            click(){ ipcMain.emit("file:open", files[i]); }
          })
        );
      }
      openRecentMenu.append(new MenuItem({ type: 'separator' }));
      openRecentMenu.append(
        new MenuItem({
          label: i18n.__('menu.clearRecent'),
          enabled: this.enabled,
          click(){ ipcMain.emit("file:clear-recent"); }
        })
      );
    }
  }

  private setLocalesMenu(localesMenu: Menu): void {
    const locales = i18n.getLocales();
    for(let i = 0; i < locales.length; i++){
      localesMenu.append(
        new MenuItem(
          { 
            label: locales[i],
            type: "checkbox",
            enabled: this.enabled,
            checked: (this.status.locale == locales[i]),
            click(item, focusedWindow) { ipcMain.emit("view:set-locale", item, focusedWindow); }
          },
        )
      )
    }
  }
}
