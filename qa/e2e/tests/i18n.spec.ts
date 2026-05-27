import { test, expect } from '@playwright/test'

test('i18n - language switch via HeroUI Select', async ({ page }) => {
  await page.goto('/settings')
  await page.waitForSelector('[data-testid="language-select"]', { timeout: 15_000 })

  // HeroUI Select is a custom component; click it to open the dropdown
  const select = page.locator('[data-testid="language-select"]')
  await select.click()
  await page.waitForTimeout(500)

  // Click the Español option from the dropdown
  const option = page.locator('li[data-key="es"], [data-value="es"], .select-option:has-text("Español")').first()
  if (await option.isVisible()) {
    await option.click()
  } else {
    // Fallback: press arrow down + enter
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
  }
  await page.waitForTimeout(500)

  // Verify welcome text switches to Spanish
  await expect(page.locator('[data-testid="welcome-text"]')).toContainText('Bienvenido')
})
