import { app, Menu, MenuItemConstructorOptions, ipcMain, MenuItem} from "electron";
import i18n from "./i18n";
import { FileHistory } from "./file-history";
import { AppStatus } from "./main";

export class AppMenu {
  private status: AppStatus;
  private fileHistory: FileHistory;

  constructor(status: AppStatus, fileHistory: FileHistory) {
    this.status = status;
    this.fileHistory = fileHistory;
  }

  private fileUsable() {
    return this.status.editorEnabled && !this.status.projectsEnabled
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
          enabled: this.status.editorEnabled,
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
          enabled: true,
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
        { label: i18n.__("menu.quit"), role: "quit" }
      ]
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
          enabled: this.status.editorEnabled,
          click() { ipcMain.emit("endpoint:local"); }
        }, 
        {
          label: i18n.__("menu.openLocalAdminURL"),
          enabled: this.status.editorEnabled,
          click() { ipcMain.emit("endpoint:local-admin"); }
        },
        { type: "separator" },
        {
          label: i18n.__("menu.ngrokConnect"),
          enabled: (this.status.ngrokUrl.length === 0),
          click() { ipcMain.emit("ngrok:connect"); }
        },
        {
          label: i18n.__("menu.ngrokDisconnect"),
          enabled: (this.status.ngrokUrl.length > 0),
          click() { ipcMain.emit("ngrok:disconnect") }
        }, 
        {
          label: i18n.__("menu.openPublicURL"),
          enabled: (this.status.ngrokUrl.length > 0),
          click() { ipcMain.emit("endpoint:public"); }
        }, 
        {
          label: i18n.__("menu.openNgrokInspect"),
          enabled: this.status.ngrokStarted,
          click() { ipcMain.emit("ngrok:inspect"); }
        } 
      ]
    };
  
  
    const view: MenuItemConstructorOptions = {
      label: i18n.__("menu.view"),
      submenu: [
        {
          label: i18n.__("menu.reload"),
          accelerator: "CmdOrCtrl+R",
          click(item, focusedWindow) { ipcMain.emit("view:reload", item, focusedWindow); }
        },
        { type: "separator" },
        {
          label: i18n.__("menu.locales") + "...",
          submenu: [],
        },
        { type: "separator" },
        { label: i18n.__("menu.resetzoom"), role: "resetzoom" },
        { label: i18n.__("menu.zoomin"), role: "zoomin" },
        { label: i18n.__("menu.zoomout"), role: "zoomout" },
        { type: "separator" },
        { label: i18n.__("menu.togglefullscreen"), role: "togglefullscreen" },
        { label: i18n.__("menu.minimize"), role: "minimize" }
      ]
    };
    
    const help: MenuItemConstructorOptions = {
      role: "help",
      submenu: [
        {
          label: "Node-RED",
          click() { ipcMain.emit("help:node-red"); }
        },
        {
          label: "Node-RED-Desktop",
          click() { ipcMain.emit("help:node-red-desktop"); }
        },
        // {
        //   label: "Author",
        //   click() { ipcMain.emit("help:author"); }
        // },
        { type: "separator" },
        {
          label: i18n.__("menu.checkversion") + "...",
          // enabled: true,
          click() { ipcMain.emit("help:check-updates"); }
        },
        {
          label: i18n.__("menu.version"),
          click() { ipcMain.emit("help:version"); }
        }
      ]
    };
  
    const dev: MenuItemConstructorOptions = {
      label: "Dev",
      submenu: [
        {   
          label: "Toggle Developer Tools",
          accelerator: process.platform === "darwin" ? "Alt+Command+I" : "Ctrl+Shift+I",
          click(item, focusedWindow) { ipcMain.emit("dev:tools", item, focusedWindow); }
        }
      ]
    };
  
    const darwin: MenuItemConstructorOptions = {
      label: app.getName(),
      submenu: [
        { label: i18n.__('menu.about'), role: 'about' },
        { type: "separator" },
        { role: "services", submenu: []},
        { type: "separator" },
        { label: i18n.__('menu.hide'), role: 'hide'},
        { label: i18n.__('menu.hideothers'), role: 'hideothers'},
        { label: i18n.__('menu.unhide'), role: 'unhide'},
        { type: 'separator'},
        { label: i18n.__('menu.quit'), role: 'quit' }
      ]
    };
  
    let template: MenuItemConstructorOptions[];
    let openRecentMenu: Menu | any;
    let localesMenu: Menu | any;
  
    if (process.platform === "darwin") {
      template = [darwin, file, edit, endpoint, view, help];
    } else {
      template = [file, endpoint, view, help];
    }
  
    if (new RegExp(`${app.getName()}-debug`).exec(process.env.NODE_DEBUG!)) {
      template.push(dev);
    };
  
    const menu = Menu.buildFromTemplate(template);
    if (process.platform === "darwin") {
      openRecentMenu = (menu.items[1] as any).submenu.items[2];
      localesMenu = (menu.items[4] as any).submenu.items[2];
    } else {
      openRecentMenu = (menu.items[0] as any).submenu.items[2];
      localesMenu = (menu.items[2] as any).submenu.items[2];
    }
    this.setOpenRecentMenu(openRecentMenu.submenu);
    openRecentMenu.enabled = (openRecentMenu.submenu.items.length > 0);
    this.setLocalesMenu(localesMenu.submenu);
    Menu.setApplicationMenu(menu);
  }

  private setOpenRecentMenu(openRecentMenu: Menu): void{
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
          click(){ ipcMain.emit("file:clear-recent"); }
        })
      );
    }
  }

  private setLocalesMenu(localesMenu: Menu): void{
    const locales = i18n.getLocales();
    for(let i = 0; i < locales.length; i++){
      localesMenu.append(
        new MenuItem(
          { 
            label: locales[i],
            type: "checkbox",
            checked: (this.status.locale == locales[i]),
            click(item, focusedWindow) { ipcMain.emit("view:set-locale", item, focusedWindow); }
          },
        )
      )
    }
  }
}
