declare module 'electron-json-storage-sync' {
  export type success = {
    status: boolean;
    data: success | error;
  }
  export type error = {
    status: false;
    error: any;
  }
  export interface DataOptions { dataPath: string; }
  export function getDefaultDataPath(): string;
  export function setDataPath(directory?: string): void;
  export function getDataPath(): string;
  export function get(key: string): success | error;
  export function get(key: string, options: DataOptions): success | error;
  export function getMany(keys: ReadonlyArray<string>): success | error;
  export function getMany(keys: ReadonlyArray<string>, options: DataOptions): success | error;
  export function getAll(): success | error;
  export function getAll(options: DataOptions): success | error;
  export function set(key: string, json: object): any | void;
  export function set(key: string, json: object, options: DataOptions): any | void;
  export function has(key: string): boolean;
  export function has(key: string, options: DataOptions): boolean;
  export function keys(): string[];
  export function keys(options: DataOptions): string[];
  export function remove(key: string): any | void;
  export function remove(key: string, options: DataOptions): any | void;
  export function clear(): any | void;
  export function clear(options: DataOptions): any | void;
}

