import { test, expect } from '@playwright/test'

test('error handling - network failure', async ({ page }) => {
  // Mock network failure
  await page.route('**/api/v1/auth/login', route => route.abort())

  await page.goto('/login')
  await page.fill('[data-testid="username"]', 'admin@parkflow.local')
  await page.fill('[data-testid="password"]', 'Qwert.12345')
  await page.click('[data-testid="login-button"]')

  await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
  await expect(page.locator('[data-testid="error-message"]')).toContainText(/error/i)
})
