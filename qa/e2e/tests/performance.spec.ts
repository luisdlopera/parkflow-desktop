import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test('performance - dashboard load time', async ({ page }) => {
  const startTime = Date.now()

  await loginAsAdmin(page)

  await page.waitForSelector('[data-testid="summary-loaded"]')

  const loadTime = Date.now() - startTime

  expect(loadTime).toBeLessThan(2000) // < 2s
})
