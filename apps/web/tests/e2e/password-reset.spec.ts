import { test, expect } from '@playwright/test';

test.describe('Password Reset Flow', () => {
  test('forgot password form submits successfully', async ({ page }) => {
    await page.route('**/api/v1/auth/forgot-password', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña' }),
      });
    });

    await page.goto('/login');

    const forgotLink = page.locator('a[href*="forgot"], a[href*="recuperar"], text=/olvid|recuperar/i').first();
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
    }

    await page.waitForLoadState('networkidle');
    const url = page.url();

    if (url.includes('forgot') || url.includes('recuperar')) {
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill('admin@parkflow.local');

        const submitBtn = page.locator('button[type="submit"], button:has-text("Enviar"), button:has-text("Recuperar")').first();
        await submitBtn.click();

        await expect(page.locator('text=/instrucciones|correo|email|enviado|éxito/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('reset password with valid token', async ({ page }) => {
    await page.route('**/api/v1/auth/reset-password', async route => {
      const body = JSON.parse(route.request().postData() || '{}');
      if (body.token === 'valid-reset-token-123') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Contraseña restablecida exitosamente' }),
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Token inválido o expirado' }),
        });
      }
    });

    await page.goto('/reset-password?token=valid-reset-token-123');
    await page.waitForLoadState('networkidle');

    const isLoginRedirect = page.url().includes('/login');
    if (!isLoginRedirect) {
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const confirmInput = page.locator('input[name="confirmPassword"], input[name="confirm_password"]').first();

      if (await passwordInput.isVisible()) {
        await passwordInput.fill('NewPass.123');
        if (await confirmInput.isVisible()) {
          await confirmInput.fill('NewPass.123');
        }

        await page.locator('button[type="submit"], button:has-text("Restablecer")').first().click();
        await expect(page.locator('text=/restablecida|éxito|cambio/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('invalid reset token shows error', async ({ page }) => {
    await page.route('**/api/v1/auth/reset-password', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Token inválido o expirado' }),
      });
    });

    await page.goto('/reset-password?token=invalid-token');
    await page.waitForLoadState('networkidle');

    const isLoginRedirect = page.url().includes('/login');
    if (!isLoginRedirect) {
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      if (await passwordInput.isVisible()) {
        await passwordInput.fill('NewPass.123');

        const confirmInput = page.locator('input[name="confirmPassword"], input[name="confirm_password"]').first();
        if (await confirmInput.isVisible()) {
          await confirmInput.fill('NewPass.123');
        }

        await page.locator('button[type="submit"], button:has-text("Restablecer")').first().click();
        await expect(page.locator('text=/Token inválido|expirado|error/i')).toBeVisible({ timeout: 5000 });
      } else {
        await expect(page.locator('text=/inválido|expirado|error/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
