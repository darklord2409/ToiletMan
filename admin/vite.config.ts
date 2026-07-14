import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Vite 6's Host-header allowlist otherwise rejects requests addressed
    // to the docker-compose service name (used by other containers on the
    // same network, e.g. the Playwright e2e runner) instead of "localhost".
    allowedHosts: ["admin", "localhost"],
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
