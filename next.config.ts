import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
