import { EventEmitter } from "events";
import { AppStatus } from "./main";

// based on @node-red/runtime/lib/exec.js

const child_process = require('child_process');
const { util } = require('@node-red/util');
const path = require('path');

// In packaged Electron, npm is at resources/npm/ (via extraResources) so its
// own nested node_modules are on the real filesystem and not subject to asar
// module-resolution issues. In dev mode, use the local dist/node_modules/npm.
function getNpmCliPath(): string {
    const { app } = require('electron');
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'npm', 'bin', 'npm-cli.js');
    }
    return path.join(__dirname, '..', 'node_modules', 'npm', 'bin', 'npm-cli.js');
}

type RuntimeExec = {
    init: Function;
    run: Function;
}

let events: EventEmitter;
// The original `run` of the shared @node-red/util exec singleton, captured and
// bound before we replace it in place. Non-npm calls delegate here.
let origRun: Function;
let status: AppStatus;

function logLines(id: string, type: string, data: string): void {
    events.emit("event-log", {id:id,payload:{ts: Date.now(),data:data,type:type}});
}

const newExec = {
    init: function(_runtime: {events: any, exec: any}, _status: AppStatus) {
        if (!_runtime.exec) {
            throw new Error("runtime.exec not available");
        }
        events = _runtime.events;
        status = _status;
        if (!origRun) {
            // @node-red/registry's installer destructures `{exec}` from
            // @node-red/util at module load and calls `exec.run(...)` on that
            // SHARED singleton. `_runtime.exec` is the same object. Reassigning
            // `_runtime.exec` would NOT change the singleton the installer
            // holds, so we MUTATE the singleton's `.run` in place instead.
            const sharedExec = _runtime.exec;
            origRun = sharedExec.run.bind(sharedExec);
            sharedExec.run = newExec.run;
        }
        // @node-red/registry installer.init() calls child_process.execFile(process.execPath,
        // [npmCli, '-v']) at startup to check npm version. In packaged Electron,
        // process.execPath is the app binary — not node.js — so this spawns new Electron
        // instances in an infinite loop. Intercept execFile to return a fake npm version
        // for the startup check and to fork bundled npm-cli for info lookups.
        const origExecFile = child_process.execFile;
        child_process.execFile = function(command: string, args: any, opts: any, callback: any) {
            const isNpmCli = command === process.execPath &&
                Array.isArray(args) && typeof args[0] === 'string' && /npm-cli\.js$/.test(args[0]);
            if (isNpmCli) {
                const cb = typeof opts === 'function' ? opts : callback;
                const npmArgs = args.slice(1);
                // npm -v: return a synthetic version so installerEnabled = true
                if (npmArgs[0] === '-v') {
                    if (cb) cb(null, '10.0.0\n', '');
                    return;
                }
                // npm info or other execFile npm calls: run via fork using bundled npm-cli
                const npmCliPath = getNpmCliPath();
                const forkedOpts: any = typeof opts === 'object' && opts !== null ? { ...opts } : {};
                forkedOpts.silent = true;
                forkedOpts.windowsHide = true;
                const child = child_process.fork(npmCliPath, npmArgs, forkedOpts);
                let stdout = '';
                let stderr = '';
                child.stdout && child.stdout.on('data', (d: any) => { stdout += d; });
                child.stderr && child.stderr.on('data', (d: any) => { stderr += d; });
                child.on('close', (code: number) => {
                    if (cb) cb(code !== 0 ? new Error(stderr) : null, stdout, stderr);
                });
                return child;
            }
            return origExecFile.call(child_process, command, args, opts, callback);
        };
        // Check npm CLI path
        const fs = require('fs');
        const npmCliPath = getNpmCliPath();
        if (!fs.existsSync(npmCliPath)) {
            console.warn("npm CLI not found at", npmCliPath, "- npm operations may fail");
        }
    },
    _run: function(command: string, args: string[], options: any, emit: boolean): Promise<execResult> {
        return origRun(command,args,options,emit);
    },
    run: function(command: string, args: string[], options: any, emit: boolean): Promise<execResult> {
        // Detect an npm node-install invocation under BOTH shapes:
        //  - legacy/back-compat: a shell `npm ...` command string
        //  - v5: `command === process.execPath`, `args[0]` is a path ending in
        //    `npm-cli.js` (the Node-RED-bundled npm CLI), `args[1]` is the
        //    npm sub-command (install/remove/...).
        const isV5Npm = Array.isArray(args) && typeof args[0] === "string" && /npm-cli\.js$/.test(args[0]);
        const isNpm = command.includes('npm') || isV5Npm;
        if (!isNpm) {
            return origRun(command,args,options,emit);
        }
        var invocationId = util.generateId();
        const npmCliCommand = getNpmCliPath();
        // For the v5 shape, args[0] is Node-RED's own npm-cli path. We fork the
        // app's OWN bundled npm-cli (npmCliCommand) and child_process.fork
        // supplies the Node binary itself, so neither process.execPath nor the
        // npmCli path may appear in the forked args — drop args[0].
        const forkedArgs = isV5Npm ? args.slice(1) : args;
        const forkOptions = options ? { ...options } : {};
        forkOptions.detached = false;
        forkOptions.silent = true;
        forkOptions.windowsHide = true;

        emit && events.emit("event-log", {ts: Date.now(),id:invocationId,payload:{ts: Date.now(),data:npmCliCommand+" "+forkedArgs.join(" ")}});

        return new Promise((resolve, reject) => {
            let stdout = "";
            let stderr = "";

            const child = child_process.fork(npmCliCommand,forkedArgs,forkOptions);
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

export default newExec;
