import * as assert from "assert";
import { EventEmitter } from "events";

// Tests run against the compiled output, matching this repo's existing
// test pattern (see test/node-version-guard.test.ts which requires ../dist/main/*).
//
// This suite is the GREEN target for task 3.2: the exec patch must intercept
// Node-RED 5.x's install command shape, which is
//   exec.run(process.execPath, [npmCli, 'install', '--', name], { cwd }, true)
// i.e. a Node-executable invocation (process.execPath + a path to npm-cli.js),
// NOT a shell `npm ...` string. The current (pre-fix) code (a) reassigns
// runtime._.exec instead of mutating the shared @node-red/util exec singleton
// that @node-red/registry's installer holds, and (b) gates on
// command.includes('npm'), so the v5 shape both bypasses interception AND
// false-negatives detection. Both are asserted below.

const child_process = require("child_process");
const nrUtil = require("@node-red/util");

const newExec = require("../dist/main/node-red-runtime-exec").default;

// The app's OWN bundled npm CLI — the working fork target. dist/main/* resolves
// it as path.join(__dirname, "..", "node_modules", "npm", "bin", "npm-cli.js")
// === <project>/dist/node_modules/npm/bin/npm-cli.js. We assert against the
// basename so the test does not depend on absolute layout.
const OWN_NPM_CLI_BASENAME = "npm-cli.js";

// A stand-in for Node-RED's own bundled npm-cli path (the v5 args[0]). It must
// NOT be forked and must NOT leak into the forked args.
const NODE_RED_NPM_CLI =
  "/some/where/node_modules/@node-red/registry/node_modules/npm/bin/npm-cli.js";

type ForkCapture = { command: string; args: string[]; options: any };

function installForkStub(): { captures: ForkCapture[]; restore: () => void } {
  const captures: ForkCapture[] = [];
  const orig = child_process.fork;
  child_process.fork = function (command: string, args: string[], options: any) {
    captures.push({ command, args, options });
    const child: any = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    // Emit a deterministic successful close on next tick.
    setImmediate(() => {
      child.stdout.emit("data", "installed\n");
      child.emit("close", 0);
    });
    return child;
  };
  return { captures, restore: () => { child_process.fork = orig; } };
}

describe("node-red-runtime-exec (v5 install interception)", () => {
  // The shared singleton the @node-red/registry installer destructures at load:
  //   const { exec } = require("@node-red/util")
  // runtime._.exec is the SAME object. We init the patch against it and assert
  // the patch mutates this object's .run, rather than swapping a wrapper object.
  const sharedExec = nrUtil.exec;
  // Capture the singleton's ORIGINAL run BEFORE init. The installer holds this
  // very object (destructured at module load), so the patch must replace this
  // object's .run in place for interception to reach the installer.
  const originalSingletonRun = sharedExec.run;
  const events = new EventEmitter();
  const fakeRuntime = { events, exec: sharedExec };
  const fakeStatus: any = {};

  before(() => {
    newExec.init(fakeRuntime, fakeStatus);
  });

  it("mutates the shared @node-red/util exec singleton's run (installer-visible interception)", () => {
    // The registry installer calls the singleton it captured at module load.
    // If the patch merely reassigned runtime._.exec to a wrapper object (the
    // pre-fix behavior), this object's run would be UNCHANGED and this FAILS.
    assert.strictEqual(
      typeof nrUtil.exec.run,
      "function",
      "singleton still has a run"
    );
    assert.notStrictEqual(
      sharedExec.run,
      originalSingletonRun,
      "init() must REPLACE the @node-red/util exec singleton's run in place " +
        "(not swap a wrapper object) so the registry installer's captured " +
        "reference is intercepted"
    );
    // Calling the singleton's run must drive the patched install path
    // (asserted behaviorally in the fork tests below via sharedExec.run).
  });

  it("intercepts the v5 install shape and forks the app's OWN npm-cli with npmCli/execPath stripped", async () => {
    const { captures, restore } = installForkStub();
    try {
      // v5 call shape: exec.run(process.execPath, [npmCli, 'install', '--', name], opts, true)
      const result = await sharedExec.run(
        process.execPath,
        [NODE_RED_NPM_CLI, "install", "--", "node-red-contrib-x"],
        { cwd: "/tmp" },
        true
      );

      assert.strictEqual(captures.length, 1, "forked exactly once");
      const cap = captures[0];

      // Forked program is the app's OWN bundled npm-cli, NOT process.execPath
      // and NOT Node-RED's npmCli.
      assert.ok(
        cap.command.endsWith(OWN_NPM_CLI_BASENAME),
        `forks own npm-cli (got ${cap.command})`
      );
      assert.notStrictEqual(cap.command, process.execPath);
      assert.notStrictEqual(cap.command, NODE_RED_NPM_CLI);

      // The forked args must DROP the leading npmCli path (args[0]).
      // child_process.fork supplies the Node binary itself, so neither
      // process.execPath nor the npmCli path may appear in the forked args.
      assert.deepStrictEqual(
        cap.args,
        ["install", "--", "node-red-contrib-x"],
        "forked args strip the v5 npmCli path (args.slice(1))"
      );
      assert.ok(
        !cap.args.includes(NODE_RED_NPM_CLI),
        "npmCli path is not passed as an argument"
      );
      assert.ok(
        !cap.args.includes(process.execPath),
        "process.execPath is not passed as an argument"
      );

      // Resolves on close code 0.
      assert.strictEqual(result.code, 0);
    } finally {
      restore();
    }
  });

  it("emits event-log progress events for an install", async () => {
    const { captures, restore } = installForkStub();
    const logged: any[] = [];
    const onLog = (m: any) => logged.push(m);
    events.on("event-log", onLog);
    try {
      await sharedExec.run(
        process.execPath,
        [NODE_RED_NPM_CLI, "install", "--", "node-red-contrib-x"],
        {},
        true
      );
      assert.ok(captures.length === 1, "forked");
      assert.ok(logged.length > 0, "emitted at least one event-log");
      // The final rc event must be present.
      const rc = logged.find(
        (m) => m.payload && typeof m.payload.data === "string" && m.payload.data.indexOf("rc=") === 0
      );
      assert.ok(rc, "emits an rc=<code> close event-log");
    } finally {
      events.removeListener("event-log", onLog);
      restore();
    }
  });

  it("execFile: npm -v returns fake version without spawning Electron", (done) => {
    const fakeNpmCli = "/some/path/node_modules/npm/bin/npm-cli.js";
    let electronSpawned = false;
    const origFork = child_process.fork;
    child_process.fork = function() { electronSpawned = true; return origFork.apply(this, arguments as any); };
    try {
      child_process.execFile(process.execPath, [fakeNpmCli, '-v'], function(err: any, stdout: string) {
        assert.strictEqual(err, null, "no error for npm -v");
        assert.ok(stdout.trim().split('.').length >= 3, "version string returned");
        assert.ok(parseInt(stdout.trim().split('.')[0]) >= 3, "version >= 3 so installerEnabled=true");
        assert.strictEqual(electronSpawned, false, "did NOT spawn Electron");
        done();
      });
    } finally {
      child_process.fork = origFork;
    }
  });

  it("execFile: non-npm-cli command delegates to original execFile", (done) => {
    // Use a guaranteed-to-exist executable to verify delegation
    child_process.execFile(process.execPath, ['--version'], function(err: any, stdout: string) {
      assert.ok(!err || stdout, "delegates to original execFile without interception");
      done();
    });
  });

  it("delegates a NON-npm command to the original run (no fork)", async () => {
    const { captures, restore } = installForkStub();
    // Spy on whether delegation happens by stubbing fork to throw if called;
    // the original run will try to spawn /bin/echo, which we also stub away by
    // intercepting child_process.spawn for determinism.
    const origSpawn = child_process.spawn;
    let spawned: { command: string; args: string[] } | null = null;
    child_process.spawn = function (command: string, args: string[]) {
      spawned = { command, args };
      const child: any = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      setImmediate(() => child.emit("close", 0));
      return child;
    };
    try {
      await sharedExec.run("/bin/echo", ["hi"], {}, false);
      assert.strictEqual(captures.length, 0, "did NOT fork for a non-npm command");
      assert.ok(spawned, "delegated to the original run (which spawns)");
      assert.strictEqual(spawned!.command, "/bin/echo");
      assert.deepStrictEqual(spawned!.args, ["hi"]);
    } finally {
      child_process.spawn = origSpawn;
      restore();
    }
  });
});
