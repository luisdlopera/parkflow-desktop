import { test, expect } from '@playwright/test'

test('responsive - mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 }) // iPhone

  await page.goto('/dashboard')

  await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
  await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeHidden()
})