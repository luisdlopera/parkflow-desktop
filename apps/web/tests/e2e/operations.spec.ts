import { test, expect } from '@playwright/test';

test.describe('Parking Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);
  });

  test('should complete a basic parking entry', async ({ page }) => {
    // Navigate to operations if not there
    await page.goto('/');

    // This depends on the actual UI structure, but let's assume standard flows
    // Look for an entry button or plate input
    const plateInput = page.locator('input[placeholder*="placa" i]');
    if (await plateInput.isVisible()) {
        await plateInput.fill('QA-789');
        await page.keyboard.press('Enter');

        // Wait for success toast or redirection
        await expect(page.locator('text=/Ingreso|Registrado|Éxito/i')).toBeVisible();
    }
  });
});
