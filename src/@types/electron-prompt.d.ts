declare module "electron-prompt" {
  interface promptOptions extends Electron.BrowserWindowConstructorOptions {
    label?: string;
    value?: string;
    type?: string;
    inputAttrs?: object;
    selectOptions?: object;
    useHtmlLabel?: boolean;
    icon?: string;
  }

  export default function (options?: promptOptions, parentBrowserWindow?: Electron.BrowserWindow): Promise<string | undefined>;

}
