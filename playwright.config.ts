import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 30_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader"] },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev --host 127.0.0.1",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
