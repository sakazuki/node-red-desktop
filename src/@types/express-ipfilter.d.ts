declare module "express-ipfilter" {
  type IpFilterOptions = {
    mode?: string;
    log?: boolean;
    logLevel?: string;
    excluding?: string[];
    detectIp?: Function;
    trustProxy?: boolean | string[] | string | number | Function
  }
  export function IpFilter (ips: string[] | Function, options: IpFilterOptions): any;
  export function IpDeniedError(message?: string, extra?: object): Error
}

