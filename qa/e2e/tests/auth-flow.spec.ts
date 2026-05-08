import { test, expect } from '@playwright/test'

test('login flow', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[data-testid="username"]', 'admin')
  await page.fill('[data-testid="password"]', 'admin123')
  await page.click('[data-testid="login-button"]')
  await expect(page).toHaveURL('/dashboard')
})