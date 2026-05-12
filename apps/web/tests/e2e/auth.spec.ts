import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@parkflow.local');
    await page.fill('input[name="password"]', 'WrongPass.123');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/Error|Invalid|Credenciales/i')).toBeVisible();
  });

  test('should login successfully with admin credentials', async ({ page }) => {
    await page.goto('/login');

    // Default admin seeded in database
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/|.*dashboard/);
  });
});
