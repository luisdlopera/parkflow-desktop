import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, devices } from '@playwright/test';
import { playwrightBase } from '@parkflow/config/playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  ...playwrightBase,
  testDir: path.resolve(__dirname, '../../qa/e2e/tests'),
  use: {
    ...playwrightBase.use,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm -C ../.. dev:web',
    url: 'http://localhost:6001',
    reuseExistingServer: true,
  },
});
