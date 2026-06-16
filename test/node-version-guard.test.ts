import * as assert from "assert";

// Tests run against the compiled output, matching this repo's existing
// test pattern (see test/custom-storage.spec.ts which requires ../dist/main/*).
const { checkNodeVersion, assertNodeVersion, NODE_VERSION_FLOOR } =
  require("../dist/main/node-version-guard");

describe("node-version-guard", () => {
  describe("checkNodeVersion", () => {
    it("reports a named requirement error below the floor", () => {
      const result = checkNodeVersion("22.8.0", "22.9.0");
      assert.strictEqual(result.ok, false);
      assert.ok(result.message.includes("22.9.0"), "names the required floor");
      assert.ok(result.message.includes("22.8.0"), "names the running version");
    });

    it("reports a named requirement error for an older major", () => {
      const result = checkNodeVersion("20.0.0", "22.9.0");
      assert.strictEqual(result.ok, false);
      assert.ok(result.message.includes("22.9.0"));
    });

    it("passes exactly at the floor", () => {
      assert.deepStrictEqual(checkNodeVersion("22.9.0", "22.9.0"), { ok: true });
    });

    it("passes for a higher minor (22.10.0 > 22.9.0)", () => {
      assert.deepStrictEqual(checkNodeVersion("22.10.0", "22.9.0"), { ok: true });
    });

    it("passes for a higher major", () => {
      assert.deepStrictEqual(checkNodeVersion("24.0.0", "22.9.0"), { ok: true });
    });

    it("defaults the floor to NODE_VERSION_FLOOR", () => {
      assert.strictEqual(NODE_VERSION_FLOOR, "22.9.0");
      assert.strictEqual(checkNodeVersion("24.0.0").ok, true);
      assert.strictEqual(checkNodeVersion("20.0.0").ok, false);
    });
  });

  describe("assertNodeVersion", () => {
    it("throws a named requirement error below the floor", () => {
      assert.throws(
        () => assertNodeVersion("20.0.0", "22.9.0"),
        /requires Node\.js >= 22\.9\.0/
      );
    });

    it("does not throw at or above the floor", () => {
      assert.doesNotThrow(() => assertNodeVersion("22.9.0", "22.9.0"));
      assert.doesNotThrow(() => assertNodeVersion("22.10.0", "22.9.0"));
    });
  });
});
