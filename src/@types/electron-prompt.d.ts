declare module "electron-prompt" {
  interface promptOptions {
    title?: string;
    width?: number;
    height?: number;
    resizable?: boolean;
    label?: string;
    value?: string;
    type?: string;
    inputAttrs?: object;
    selectOptions?: object;
    useHtmlLabel?: boolean;
    icon?: string;
    customStylesheet?: string;
  }

  export default function (options?: promptOptions, parentBrowserWindow?: Electron.BrowserWindow): Promise<string | undefined>;

}
