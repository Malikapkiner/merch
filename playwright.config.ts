import { defineConfig } from "@playwright/test";
import { testDatabaseUrl } from "./tests/database";

const port = 3100;
const distDir = ".next-e2e";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  use: {
    baseURL: `http://localhost:${port}`,
    // Locally the installed Chrome is used; CI installs Playwright's chromium.
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
  },
  // The standalone production build, as the Dockerfile ships it, with the fake payment provider forced on (never set it live).
  webServer: {
    command: `pnpm build && cp -R ${distDir}/static ${distDir}/standalone/${distDir}/static && PORT=${port} node ${distDir}/standalone/server.js`,
    url: `http://localhost:${port}/api/health`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: testDatabaseUrl(),
      PAYMENT_PROVIDER: "fake",
      NEXT_DIST_DIR: distDir,
      HOSTNAME: "localhost",
      SITE_URL: `http://localhost:${port}`,
    },
  },
});
