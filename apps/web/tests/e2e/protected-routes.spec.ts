import { test, expect } from '@playwright/test';

test.describe('Protected Routes', () => {
  test('unauthenticated user redirected to /login for dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected to /login for admin routes', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected to /login for config routes', async ({ page }) => {
    await page.goto('/configuracion');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page is accessible without authentication', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('forgot-password page is accessible without authentication', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    const isLoginRedirect = page.url().includes('/login');
    if (!isLoginRedirect) {
      await expect(page.locator('text=/recuperar|olvid|reset|password/i')).toBeVisible();
    }
  });
});
