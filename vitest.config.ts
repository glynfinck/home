import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

// Tests talk to the local Supabase started by `supabase start`. Load its
// URL/keys from .env.local for both the main process (e2e globalSetup) and
// the test workers (see tests/setup.ts).
loadEnv({ path: ".env.local" });

// Resolve the "@/..." import alias the app uses (see tsconfig paths) so unit
// tests can import app modules the same way the app does.
const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    // Integration + e2e share one local database — keep them serial so they
    // never race on rows or the dev server port.
    fileParallelism: false,
    projects: [
      {
        // Pure logic + component-contract tests. No database or server, so
        // this project runs standalone: `npm run test:unit`.
        resolve: { alias: { "@": rootDir } },
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          environment: "node",
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/setup.ts"],
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
      {
        test: {
          name: "e2e",
          include: ["tests/e2e/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/setup.ts"],
          // boots `next start`, uploads the PDF fixture, tears the server down
          globalSetup: ["tests/e2e/global-setup.ts"],
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
