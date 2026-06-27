import { defineConfig, devices } from '@playwright/test';
import { playwrightBase } from '@parkflow/config/playwright';

export default defineConfig({
  ...playwrightBase,
  testDir: './tests',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'pnpm --filter @parkflow/web dev',
    url: 'http://localhost:6001',
    reuseExistingServer: true,
  },
});
