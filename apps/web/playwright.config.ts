import { defineConfig, devices } from '@playwright/test';
import { playwrightBase } from '@parkflow/config/playwright';

export default defineConfig({
  ...playwrightBase,
  testDir: './tests/e2e',
  reporter: 'html',
  use: {
    ...playwrightBase.use,
    trace: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- -p 6001',
    url: 'http://localhost:6001',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
