import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test('error recovery - app crash and reload', async ({ page }) => {
  await loginAsAdmin(page)

  // Simulate crash by reloading without state
  await page.reload()

  // Check if app recovers gracefully
  await expect(page.locator('[data-testid="dashboard-root"]')).toBeVisible()
  await expect(page.locator('[data-testid="error-message"]')).toBeHidden()
})
