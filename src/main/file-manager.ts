import path from "path";
import fs from "fs-extra";
import tmp from "tmp";
import os from "os";

export class FileManager {
  private tmpBuffer: Array<tmp.FileResult> = [];
  private userDir: string;
  private prefix: string;

  constructor(prefix: string) {
    this.userDir = this.setupUserDir(prefix);
    this.prefix = prefix + "-";
    this.clearTmp();
  }

  public createTmp() {
    const tmpfile = tmp.fileSync({dir: this.userDir, prefix: this.prefix, postfix: '.tmp', discardDescriptor: true});
    this.tmpBuffer.push(tmpfile);
    fs.writeFileSync(tmpfile.name, "");
    return tmpfile.name;
  }

  private setupUserDir(appname: string) {
    const destdir = path.join(os.homedir(), "." + appname);
    if (!fs.existsSync(destdir)) fs.mkdirSync(destdir);
    return destdir;
  }

  public getUserDir() {
    return this.userDir;
  }

  public test(file: string){
    return new RegExp(`${this.prefix}(.+)\.tmp`).exec(path.basename(file));
  }

  private clearBackup(file: tmp.FileResult) {
    const filePath = path.parse(file.name);
    const backup = path.join(filePath.dir, `.${filePath.base}.backup`);
    if (fs.existsSync(backup)) fs.removeSync(backup);
  }

  private clearCredential(file: tmp.FileResult) {
    const filePath = path.parse(file.name);
    const backup = path.join(filePath.dir, `.${filePath.name}_cred${filePath.ext}.backup`);
    if (fs.existsSync(backup)) fs.removeSync(backup);
  }

  public clearTmp(){
    this.tmpBuffer.forEach((file) => {
      this.clearBackup(file);
      this.clearCredential(file);
      file.removeCallback();
    });
  }

  private remove(file: string) {
    const fliePath = path.parse(file);
    if (fs.existsSync(file)) fs.removeSync(file);
    const cred = path.join(fliePath.dir, `${fliePath.name}_cred${fliePath.ext}`);
    if (fs.existsSync(cred)) fs.removeSync(cred);
  }

  private move(src: string, dest: string){
    fs.moveSync(src, dest);
    const srcPath = path.parse(src);
    const credSrc = path.join(srcPath.dir, `${srcPath.name}_cred${srcPath.ext}`);
    const destPath = path.parse(dest);
    const credDst = path.join(destPath.dir, `${destPath.name}_cred${destPath.ext}`);
    if (fs.existsSync(credSrc)) fs.moveSync(credSrc, credDst);
  }

  private copy(src: string, dest: string){
    fs.copySync(src, dest);
    const srcPath = path.parse(src);
    const credSrc = path.join(srcPath.dir, `${srcPath.name}_cred${srcPath.ext}`);
    const destPath = path.parse(dest);
    const credDst = path.join(destPath.dir, `${destPath.name}_cred${destPath.ext}`);
    if (fs.existsSync(credSrc)) fs.copySync(credSrc, credDst);
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