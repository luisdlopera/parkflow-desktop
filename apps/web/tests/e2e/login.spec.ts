import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should redirect to /login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show validation errors with empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/requerido|required|inválido|inválida/i')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@parkflow.local');
    await page.fill('input[name="password"]', 'WrongPass.123');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/Error|Invalid|Credenciales|incorrecto/i')).toBeVisible();
  });

  test('should login successfully and redirect to dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('text=/Dashboard|Panel|Inicio/i')).toBeVisible();
  });

  test('should persist session across page reload', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);

    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('text=/Dashboard|Panel|Inicio/i')).toBeVisible();
  });
});
