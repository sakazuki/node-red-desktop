import { EventEmitter } from "events";

// based on @node-red/runtime/lib/exec.js

const child_process = require('child_process');
const { util } = require('@node-red/util');
const path = require('path');

type RuntimeExec = {
    init: Function;
    run: Function;
}

let events: EventEmitter;
let origExec: RuntimeExec;

function logLines(id: string, type: string, data: string): void {
    events.emit("event-log", {id:id,payload:{ts: Date.now(),data:data,type:type}});
}

const newExec = {
    init: function(_runtime: {events: any, exec: any}) {
        events = _runtime.events;
        if (!origExec) {
            origExec = _runtime.exec;
            _runtime.exec = this;
        }
    },
    run: function(command: string, args: string[], options: any, emit: boolean): Promise<execResult> {
        if (path.parse(command).name !== "npm") {
            return origExec.run(command,args,options,emit);
        }
        var invocationId = util.generateId();
        const npmCliCommand= path.join(__dirname, "..", "node_modules", "npm", "bin", "npm-cli.js");
        if (options) {
            options.detached = false;
            options.silent = true;
        }

        emit && events.emit("event-log", {ts: Date.now(),id:invocationId,payload:{ts: Date.now(),data:npmCliCommand+" "+args.join(" ")}});

        return new Promise((resolve, reject) => {
            let stdout = "";
            let stderr = "";

            const child = child_process.fork(npmCliCommand,args,options);
            child.stdout.on('data', (data: any) => {
                const str = ""+data;
                stdout += str;
                emit && logLines(invocationId,"out",str);
            });
            child.stderr.on('data', (data: any) => {
                const str = ""+data;
                stderr += str;
                emit && logLines(invocationId,"err",str);
            });
            child.on('error', function(err: Error) {
                stderr = err.toString();
                emit && logLines(invocationId,"err",stderr);
            })
            child.on('close', (code: number) => {
                let result = {
                    code: code,
                    stdout: stdout,
                    stderr: stderr
                }
                emit && events.emit("event-log", {id:invocationId,payload:{ts: Date.now(),data:"rc="+code}});

                if (code === 0) {
                    resolve(result)
                } else {
                    reject(result);
                }
            });
        })
    }
}

export = newExec;
