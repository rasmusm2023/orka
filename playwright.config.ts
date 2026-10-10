import { defineConfig, devices } from "@playwright/test";

const desktopChrome = devices["Desktop Chrome"];
const mobileChrome = devices["Pixel 7"];

if (!desktopChrome || !mobileChrome) {
  throw new Error("Playwright device presets are missing.");
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    locale: "sv-SE",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...desktopChrome,
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile",
      use: {
        ...mobileChrome,
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
