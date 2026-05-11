import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test('responsive - mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 }) // iPhone

  await loginAsAdmin(page)

  await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
  await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeHidden()
})
