import child_process from "child_process";

interface execResult { 
  code: number;
  stdout: string;
  stderr: string;
}

export default function fork(cmdPath: string, args: string[], options: any): Promise<execResult> {
  if (options) {
    options.detached = false;
    options.silent = true;
  }
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const child = child_process.fork(cmdPath,args,options);
    child.stdout.on("data", (data: string) => {
      const str = ""+data;
      stdout += str;
    });
    child.stderr.on("data", (data: string) => {
      const str = ""+data;
      stderr += str;
    });
    child.on("error", function(err: Error) {
      stderr = err.toString();
    })
    child.on("close", (code: number) => {
      const result = {
        code: code,
        stdout: stdout,
        stderr: stderr
      }

      if (code === 0) {
        resolve(result)
      } else {
        reject(result);
      }
    });
  })
}
