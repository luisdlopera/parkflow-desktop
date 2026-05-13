import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:6001',
  },
  webServer: {
    command: 'pnpm dev:web',
    url: 'http://localhost:6001',
    reuseExistingServer: true,
  },
  retries: process.env.CI ? 2 : 0,
  trace: 'on-first-retry',
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
})
