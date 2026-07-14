import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    // Vite 6's Host-header allowlist otherwise rejects requests addressed
    // to the docker-compose service name (used by other containers on the
    // same network, e.g. the Playwright e2e runner) instead of "localhost".
    // ".trycloudflare.com" allows a `cloudflared tunnel --url` quick tunnel
    // (a random subdomain each run) to reach the dev server for local
    // Telegram Mini App testing — Telegram requires HTTPS, so a tunnel is
    // the only way to open this dev server from inside a real Telegram client.
    allowedHosts: ["miniapp", "localhost", ".trycloudflare.com"],
    watch: {
      // Native fs events don't reliably propagate through the Docker
      // Desktop bind mount on Windows, so HMR silently serves stale
      // files without polling.
      usePolling: true,
      interval: 300,
    },
    proxy: {
      "/api": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
      "/media": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
