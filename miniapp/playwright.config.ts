import { defineConfig, devices } from "@playwright/test";

const iPhone13 = { ...devices["iPhone 13"] };
if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
  // Both properties make this musl/Alpine dev container's system Chromium
  // crash on launch (confirmed by bisecting each field of the device preset
  // individually): `screen` (distinct from `viewport`) and `defaultBrowserType`
  // (normally inert codegen metadata) each independently push Chromium down a
  // Vulkan/ANGLE surface-init path its software SwiftShader can't satisfy.
  // Dropping them keeps full iPhone 13 emulation (UA, viewport,
  // deviceScaleFactor, touch) intact — only these two incidental properties
  // are container-specific.
  delete (iPhone13 as { screen?: unknown }).screen;
  delete (iPhone13 as { defaultBrowserType?: unknown }).defaultBrowserType;
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Playwright's bundled Chromium/headless-shell binaries are glibc-only and
    // won't run on musl libc (e.g. the Alpine-based dev container) — set this
    // to a system Chromium binary (`apk add chromium`) in that case.
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? {
          launchOptions: {
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
            args: ["--no-sandbox", "--disable-dev-shm-usage"],
          },
        }
      : {}),
  },
  projects: [
    {
      name: "setup",
      testMatch: /global\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...iPhone13, storageState: "e2e/.auth/customer.json" },
      dependencies: ["setup"],
    },
  ],
});
