import semver from "semver";

/**
 * Minimum Node.js version required by the embedded Node-RED 5.x runtime.
 */
export const NODE_VERSION_FLOOR = "22.9.0";

export interface NodeVersionCheck {
  ok: boolean;
  message?: string;
}

/**
 * Pure comparison of a running Node.js version against a required floor.
 * Returns ok=true when current >= floor; otherwise ok=false with a message
 * that names the unmet requirement.
 */
export function checkNodeVersion(
  current: string,
  floor: string = NODE_VERSION_FLOOR
): NodeVersionCheck {
  const coercedCurrent = semver.coerce(current);
  if (!coercedCurrent || !semver.valid(coercedCurrent)) {
    return {
      ok: false,
      message:
        `Node-RED Desktop requires Node.js >= ${floor} ` +
        `but the running Node.js version "${current}" could not be determined.`
    };
  }
  if (semver.lt(coercedCurrent, floor)) {
    return {
      ok: false,
      message:
        `Node-RED Desktop requires Node.js >= ${floor} ` +
        `but is running on ${current}.`
    };
  }
  return { ok: true };
}

/**
 * Throws an Error naming the unmet Node.js requirement when the running
 * version is below the floor. Intended to run early in main-process bootstrap,
 * before the embedded Node-RED runtime initializes.
 */
export function assertNodeVersion(
  current: string = process.versions.node,
  floor: string = NODE_VERSION_FLOOR
): void {
  const result = checkNodeVersion(current, floor);
  if (!result.ok) {
    throw new Error(result.message);
  }
}
