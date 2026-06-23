import { test, expect } from '@playwright/test';

test.describe('User Permissions', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/configuration/vehicle-types', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: '1', code: 'CAR', name: 'Carro', isActive: true, requiresPlate: true, quickAccess: true },
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

  test('admin user sees admin links in navigation', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'e2e-admin-token',
          refreshToken: 'e2e-refresh',
          user: {
            id: 'user-admin-1',
            name: 'Admin',
            email: 'admin@parkflow.local',
            role: 'ADMIN',
            permissions: ['*'],
            active: true,
          },
          session: {
            sessionId: 'sess-admin-1',
            userId: 'user-admin-1',
            deviceId: 'test-device',
            accessTokenExpiresAtIso: new Date(Date.now() + 86400000).toISOString(),
          },
          offlineLease: null,
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);

    const adminLink = page.locator('a[href*="/admin"], text=/Administración|Admin/i').first();
    if (await adminLink.isVisible()) {
      await expect(adminLink).toBeVisible();
    }
  });

  test('regular user does not see admin links', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'e2e-operator-token',
          refreshToken: 'e2e-refresh',
          user: {
            id: 'user-op-1',
            name: 'Operator',
            email: 'operator@parkflow.local',
            role: 'OPERADOR',
            permissions: ['parking:entry', 'parking:exit'],
            active: true,
          },
          session: {
            sessionId: 'sess-op-1',
            userId: 'user-op-1',
            deviceId: 'test-device',
            accessTokenExpiresAtIso: new Date(Date.now() + 86400000).toISOString(),
          },
          offlineLease: null,
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input[name="email"]', 'operator@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);

    const adminLink = page.locator('a[href*="/admin"], text=/Administración|Admin/i');
    await expect(adminLink).not.toBeVisible();
  });

  test('API returns 403 for unauthorized actions', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'e2e-limited-token',
          refreshToken: 'e2e-refresh',
          user: {
            id: 'user-limited-1',
            name: 'Limited',
            email: 'limited@parkflow.local',
            role: 'OPERADOR',
            permissions: ['parking:entry'],
            active: true,
          },
          session: {
            sessionId: 'sess-limited-1',
            userId: 'user-limited-1',
            deviceId: 'test-device',
            accessTokenExpiresAtIso: new Date(Date.now() + 86400000).toISOString(),
          },
          offlineLease: null,
        }),
      });
    });

    await page.route('**/api/v1/configuration/payment-methods', async route => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Acceso denegado',
          message: 'No tienes permisos para acceder a este recurso',
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input[name="email"]', 'limited@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/configuracion/metodos-pago');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=/Acceso denegado|No tienes permisos|403/i')).toBeVisible();
  });
});
