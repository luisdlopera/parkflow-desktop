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

test.describe('Remember Me Checkbox', () => {
  test('should not save email when "Recordarme" is unchecked', async ({ page, context }) => {
    // Clear storage before test
    await context.clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());

    // Login without "Recordarme"
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);

    // Go back to login page
    await page.goto('/login');

    // Email should be empty
    const emailInput = await page.inputValue('input[name="email"]');
    expect(emailInput).toBe('');

    // Checkbox should be unchecked
    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).not.toBeChecked();
  });

  test('should save email when "Recordarme" is checked', async ({ page, context }) => {
    // Clear storage before test
    await context.clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());

    // Login with "Recordarme" checked
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');

    // Check the "Recordarme" checkbox
    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    // Submit login
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);

    // Go back to login page
    await page.goto('/login');

    // Email should be pre-filled
    const emailInput = await page.inputValue('input[name="email"]');
    expect(emailInput).toBe('admin@parkflow.local');

    // Checkbox should remain checked
    await expect(checkbox).toBeChecked();

    // Password should be empty (security)
    const passwordInput = await page.inputValue('input[name="password"]');
    expect(passwordInput).toBe('');
  });

  test('should clear email from localStorage on logout', async ({ page, context }) => {
    // Clear storage before test
    await context.clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());

    // Login with "Recordarme" checked
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.check();
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);

    // Verify email is saved in localStorage
    let rememberedEmail = await page.evaluate(() => {
      const data = localStorage.getItem('parkflow.auth.rememberMe');
      return data ? JSON.parse(data).email : null;
    });
    expect(rememberedEmail).toBe('admin@parkflow.local');

    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Cerrar Sesión"), button:has-text("Logout"), a:has-text("Salir")').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // If no logout button visible, use menu or navigate to logout endpoint
      await page.goto('/api/v1/auth/logout', { waitUntil: 'networkidle' });
    }

    // Verify redirected to login
    await expect(page).toHaveURL(/\/login/);

    // Verify email is cleared from localStorage
    rememberedEmail = await page.evaluate(() => {
      const data = localStorage.getItem('parkflow.auth.rememberMe');
      return data ? JSON.parse(data).email : null;
    });
    expect(rememberedEmail).toBeNull();

    // Email field should be empty
    const emailInput = await page.inputValue('input[name="email"]');
    expect(emailInput).toBe('');

    // Checkbox should be unchecked
    await expect(checkbox).not.toBeChecked();
  });
});
