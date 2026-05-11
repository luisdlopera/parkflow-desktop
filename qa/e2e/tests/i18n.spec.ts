import { test, expect } from '@playwright/test'

test('i18n - language switch', async ({ page }) => {
  await page.goto('/settings')

  await page.selectOption('[data-testid="language-select"]', 'es')

  await expect(page.locator('[data-testid="welcome-text"]')).toContainText('Bienvenido')
})
