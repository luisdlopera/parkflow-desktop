import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test('performance - dashboard load time', async ({ page }) => {
  const startTime = Date.now()

  await loginAsAdmin(page)

  // Wait for any dashboard element to be visible
  await page.waitForSelector('[data-testid="dashboard-root"], [data-testid="summary-loaded"], h1', { timeout: 15_000 })

  const loadTime = Date.now() - startTime

  expect(loadTime).toBeLessThan(2000) // < 2s
})
