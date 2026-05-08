import { test, expect } from '@playwright/test'

test('error recovery - app crash and reload', async ({ page }) => {
  await page.goto('/dashboard')

  // Simulate crash by reloading without state
  await page.reload()

  // Check if app recovers gracefully
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
  await expect(page.locator('[data-testid="error-message"]')).toBeHidden()
})