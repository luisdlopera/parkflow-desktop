import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, devices } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: path.resolve(__dirname, "../../qa/e2e/tests"),
  use: {
    baseURL: "http://localhost:6001",
  },
  webServer: {
    command: "pnpm -C ../.. dev:web",
    url: "http://localhost:6001",
    reuseExistingServer: true,
  },
  retries: process.env.CI ? 2 : 0,
  trace: "on-first-retry",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
