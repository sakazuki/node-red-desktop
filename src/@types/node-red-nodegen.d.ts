declare module 'node-red-nodegen' {
  interface NodegenData {
    src: string;
    dst?: string;
    prefix?: string;
    name?: string;
    module?: string;
    version?: string;
    keywords?: string;
    category?: string;
    icon?: string;
    color?: string;
  }
  interface NodegenOpt {
    obfuscate?: boolean;
    tgz?: boolean;
  }
  export function function2node(data: NodegenData, options: NodegenOpt): Promise<string>;
  export function swagger2node(data: NodegenData, options: NodegenOpt): Promise<string>;
}