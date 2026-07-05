import { defineConfig, devices } from "@playwright/test";

// Browser smoke layer. Runs under WebKit specifically — it's the engine behind
// mobile Safari, where CSS/layout bugs (like the typewriter clip) reproduce and
// Chromium's device emulator does not. Assertions favor DOM/geometry over pixel
// screenshots so they stay stable across OSes and CI.
//
// Requires a production build first: `npm run build` (mirrors the e2e project).

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run start",
    url: BASE_URL,
    // Reuse a locally-running server for fast iteration; always start fresh in CI.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    // iPhone profile => WebKit engine + mobile viewport + touch.
    { name: "mobile-safari", use: { ...devices["iPhone 13"] } },
  ],
});
