// @ts-nocheck
// based on @node-red/runtime/lib/exec.js

const child_process = require('child_process');
const { util } = require('@node-red/util');
const path = require('path');

var events;
var origExec;

function logLines(id,type,data) {
    events.emit("event-log", {id:id,payload:{ts: Date.now(),data:data,type:type}});
}

module.exports = {
    init: function(_runtime) {
        events = _runtime.events;
        if (!origExec) {
            origExec = _runtime.exec;
            _runtime.exec = this;
        }
    },
    run: function(command,args,options,emit) {
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
            child.stdout.on('data', (data) => {
                const str = ""+data;
                stdout += str;
                emit && logLines(invocationId,"out",str);
            });
            child.stderr.on('data', (data) => {
                const str = ""+data;
                stderr += str;
                emit && logLines(invocationId,"err",str);
            });
            child.on('error', function(err) {
                stderr = err.toString();
                emit && logLines(invocationId,"err",stderr);
            })
            child.on('close', (code) => {
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
