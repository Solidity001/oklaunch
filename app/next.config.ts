import type { NextConfig } from "next";
import path from "path";
import { SECURITY_HEADERS } from "./src/lib/security-headers";


const nextConfig: NextConfig = {
  // Fly: the Dockerfile copies .next/standalone (server.js + traced node_modules).
  output: "standalone",
  // Keep the Postgres driver external (not bundled) so it is traced into
  // .next/standalone/node_modules and scripts/migrate.mjs can import it inside
  // the image (release_command runs there, outside the Next server).
  serverExternalPackages: ["postgres"],
  // Vercel/webpack: stub out the optional `accounts` dependency that wagmi
  // references but does not install. Without this, webpack fails with
  // "Module not found: Can't resolve 'accounts'".
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      accounts: path.resolve("./src/lib/empty-module.js"),
    };
    return config;
  },
  async headers() {
    return [
      {
        // Static security headers on everything; the per-request CSP is set in src/proxy.ts.
        source: "/(.*)",
        headers: [...SECURITY_HEADERS],
      },
      {
        // The JSON API is the agent surface; never let a CDN cache a stale list.
        source: "/api/:path*",
        headers: [{ key: "cache-control", value: "no-store" }],
      },
      {
        // stored token logos: random immutable keys → cache hard (overrides the /api no-store above)
        source: "/api/launch/image/t/:key*",
        headers: [{ key: "cache-control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/llms.txt",
        headers: [{ key: "cache-control", value: "public, max-age=300" }],
      },
    ];
  },
};

export default nextConfig;