import { defineConfig } from "@playwright/test";
import path from "path";

/**
 * Playwright configuration for Electron end-to-end tests.
 * Uses the _electron API to launch the packaged/built Electron app.
 *
 * Reference: https://playwright.dev/docs/api/class-electronapplication
 */
export default defineConfig({
  testDir: "./test",
  testMatch: "**/*.spec.ts",
  timeout: 60000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    // screenshot on failure for debugging
    screenshot: "only-on-failure",
    video: "off",
  },
  // Single project for Electron tests
  projects: [
    {
      name: "electron",
      testDir: "./test",
    },
  ],
});
