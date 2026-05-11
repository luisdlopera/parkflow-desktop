import { test, expect } from '@playwright/test'

test('usability - form feedback', async ({ page }) => {
  await page.goto('/login')

  await page.fill('[data-testid="username"]', '')
  await page.fill('[data-testid="password"]', 'Qwert.12345')
  await page.click('[data-testid="login-button"]')

  await expect(page.locator('[data-testid="username-error"]')).toBeVisible()
  await expect(page.locator('[data-testid="username-error"]')).toContainText('Username is required')
})
