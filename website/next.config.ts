import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Standalone output is deliberate, not cosmetic: this app runs on a 2 vCPU /
// ~2GB VPS alongside postgres, redis, backend, bot, admin, miniapp and
// Caddy already -- a standalone build ships a pruned node_modules instead
// of the full dev dependency tree, which matters at this box's headroom.
const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "toiletman.uz" },
      { protocol: "https", hostname: "admin.toiletman.uz" },
      { protocol: "https", hostname: "shop.toiletman.uz" },
      { protocol: "http", hostname: "81.85.49.188" },
      { protocol: "http", hostname: "backend" },
    ],
  },
  // Dev-only equivalent of miniapp/vite.config.ts's server.proxy -- in
  // production Caddy does this same /api and /media forwarding instead (see
  // root Caddyfile), so this app's own code always calls same-origin paths.
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";
    return [
      { source: "/api/v1/:path*", destination: `${backend}/api/v1/:path*` },
      { source: "/media/:path*", destination: `${backend}/media/:path*` },
    ];
  },
};

export default withNextIntl(nextConfig);
