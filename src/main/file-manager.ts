import path from "path";
import fs from "fs";
import tmp from "tmp";
import os from "os";
import { ConfigManager } from "./config-manager";

export class FileManager {
  private tmpBuffer: tmp.FileResult[] = [];
  private userDir: string;
  private prefix: string;

  constructor(config: ConfigManager) {
    this.userDir = this.setupUserDir(config);
    this.prefix = config.getName() + "-";
    this.clearTmp();
  }

  public createTmp() {
    const tmpfile = tmp.fileSync({tmpdir: this.userDir, prefix: this.prefix, postfix: '.tmp', discardDescriptor: true});
    this.tmpBuffer.push(tmpfile);
    fs.writeFileSync(tmpfile.name, "");
    return tmpfile.name;
  }

  private setupUserDir(config: ConfigManager) {
    try {
      if (!fs.existsSync(config.data.userDir)) fs.mkdirSync(config.data.userDir);
      return config.data.userDir;
    } catch (err) {
      const destdir = path.join(os.homedir(), "." + config.getName());
      if (!fs.existsSync(destdir)) fs.mkdirSync(destdir);
      return destdir;
    }
  }

  public getUserDir() {
    return this.userDir;
  }

  public test(file: string){
    return new RegExp(`${this.prefix}(.+)\\.tmp`).exec(path.basename(file));
  }

  private clearBackup(file: tmp.FileResult) {
    const filePath = path.parse(file.name);
    const backup = path.join(filePath.dir, `.${filePath.base}.backup`);
    if (fs.existsSync(backup)) fs.unlinkSync(backup);
  }

  private clearCredential(file: tmp.FileResult) {
    const filePath = path.parse(file.name);
    const backup = path.join(filePath.dir, `.${filePath.name}_cred${filePath.ext}.backup`);
    if (fs.existsSync(backup)) fs.unlinkSync(backup);
  }

  public clearTmp(){
    this.tmpBuffer.forEach((file) => {
      this.clearBackup(file);
      this.clearCredential(file);
      file.removeCallback();
    });
  }

  private remove(file: string) {
    try {
      const fliePath = path.parse(file);
      if (fs.existsSync(file)) fs.unlinkSync(file);
      const cred = path.join(fliePath.dir, `${fliePath.name}_cred${fliePath.ext}`);
      if (fs.existsSync(cred)) fs.unlinkSync(cred);
    } catch (e) {
      console.log(e)
      throw new Error(`fail to remove ${file}`)
    }
  }

  private move(src: string, dest: string){
    try {
      fs.renameSync(src, dest);
      const srcPath = path.parse(src);
      const credSrc = path.join(srcPath.dir, `${srcPath.name}_cred${srcPath.ext}`);
      const destPath = path.parse(dest);
      const credDst = path.join(destPath.dir, `${destPath.name}_cred${destPath.ext}`);
      if (fs.existsSync(credSrc)) fs.renameSync(credSrc, credDst);
    } catch (e) {
      console.log(e)
      throw new Error(`fail to move ${src} to ${dest}`)
    }
  }

  private copy(src: string, dest: string){
    try {
      fs.copyFileSync(src, dest);
      const srcPath = path.parse(src);
      const credSrc = path.join(srcPath.dir, `${srcPath.name}_cred${srcPath.ext}`);
      const destPath = path.parse(dest);
      const credDst = path.join(destPath.dir, `${destPath.name}_cred${destPath.ext}`);
      if (fs.existsSync(credSrc)) fs.copyFileSync(credSrc, credDst);
    } catch (e) {
      console.log(e)
      throw new Error(`fail to copy ${src} to ${dest}`)
    }
  }

  public saveAs(src: string, dest: string){
    this.remove(dest);
    if (this.test(src)) {
      this.move(src, dest);
    } else {
      this.copy(src, dest);
    }
  }

  public info() {
    return `Userdir: ${this.userDir}`
  }

}