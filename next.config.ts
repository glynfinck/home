import { execSync } from "node:child_process";

import type { NextConfig } from "next";

/**
 * What the footer's status line reports: the commit this build was made from
 * and when. Resolved once, here, and inlined through `env`, so every page of a
 * deployment agrees and nothing is read at request time.
 *
 * Vercel builds have no `.git` directory but do set the `VERCEL_GIT_*`
 * variables; local and CI builds are the other way round.
 */
function git(args: string): string {
  try {
    return execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

const BUILD_SHA = (
  process.env.VERCEL_GIT_COMMIT_SHA || git("rev-parse HEAD")
).slice(0, 7);
const BUILD_REF =
  process.env.VERCEL_GIT_COMMIT_REF || git("rev-parse --abbrev-ref HEAD");

const nextConfig: NextConfig = {
  env: {
    BUILD_SHA,
    BUILD_REF,
    BUILD_TIME: new Date().toISOString(),
  },
  images: {
    remotePatterns: [
      // Local Supabase Storage (media bucket)
      { protocol: "http", hostname: "127.0.0.1", port: "54321" },
      // Hosted Supabase Storage
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // Figures are rendered to SVG on the server, so vega never belongs in a
  // client bundle. Externalising it also keeps `vega-canvas` out of the
  // bundler's way: it does a top-level `await import("canvas")` for an
  // optional native package that is deliberately not installed, and Node's
  // own loader handles that far better than a bundle-time resolution.
  serverExternalPackages: ["vega", "vega-lite"],
};

export default nextConfig;
