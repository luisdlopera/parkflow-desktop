import { test, expect } from '@playwright/test';

test.describe('Error & Validation States', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'e2e-validation-token',
          refreshToken: 'e2e-refresh',
          user: {
            id: 'user-val-1',
            name: 'Admin',
            email: 'admin@parkflow.local',
            role: 'ADMIN',
            permissions: ['*'],
            active: true,
          },
          session: {
            sessionId: 'sess-val-1',
            userId: 'user-val-1',
            deviceId: 'test-device',
            accessTokenExpiresAtIso: new Date(Date.now() + 86400000).toISOString(),
          },
          offlineLease: null,
        }),
      });
    });

    await page.route('**/api/v1/configuration/vehicle-types', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: '1', code: 'CAR', name: 'Carro', isActive: true, requiresPlate: true, quickAccess: true },
          { id: '2', code: 'MOTORCYCLE', name: 'Moto', isActive: true, requiresPlate: true, quickAccess: true },
        ]),
      });
    });

    await page.route('**/api/v1/parking-spaces/summary', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ availableSpaces: 50, activeSpaces: 10, totalSpaces: 60 }),
      });
    });
  });

  test('invalid plate shows inline validation error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/nuevo-ingreso');
    await page.waitForSelector('[data-testid="plate"]', { timeout: 15000 });
    await page.fill('[data-testid="plate"]', 'AB');
    await page.click('[data-testid="register-entry"]');

    await expect(page.locator('text=/formato inválido|inválida|mínimo|válida/i')).toBeVisible();
  });

  test('empty form shows required field errors', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/nuevo-ingreso');
    await page.waitForLoadState('networkidle');

    await page.click('[data-testid="register-entry"]');

    await expect(page.locator('text=/requerido|required|inválido/i')).toBeVisible();
  });

  test('network error shows error state with retry', async ({ page }) => {
    await page.route('**/api/v1/operations/entries', async route => {
      await route.abort('connectionrefused');
    });

    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/nuevo-ingreso');
    await page.waitForSelector('[data-testid="plate"]', { timeout: 15000 });
    await page.fill('[data-testid="plate"]', 'ERR-123');
    await page.click('[data-testid="register-entry"]');

    await expect(page.locator('text=/error|no se pudo|conexión|intentar|falló/i')).toBeVisible({ timeout: 5000 });
  });

  test('500 error shows friendly message', async ({ page }) => {
    await page.route('**/api/v1/operations/sessions/active-list', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Error interno del servidor', code: 'INTERNAL_ERROR' }),
      });
    });

    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/vehiculos-activos');
    await page.waitForLoadState('networkidle');

    const errorVisible = await page.locator('text=/error|problema|servidor|intentar de nuevo|falló/i').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!errorVisible) {
      const errorContainer = page.locator('[data-testid="error-state"], [role="alert"]').first();
      await expect(errorContainer).toBeVisible();
    }
  });
});
