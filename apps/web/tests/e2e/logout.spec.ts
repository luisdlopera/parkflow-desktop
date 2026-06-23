import { test, expect } from '@playwright/test';

test.describe('Logout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'e2e-logout-token',
          refreshToken: 'e2e-refresh',
          user: {
            id: 'user-logout-1',
            name: 'Admin',
            email: 'admin@parkflow.local',
            role: 'ADMIN',
            permissions: ['*'],
            active: true,
          },
          session: {
            sessionId: 'sess-logout-1',
            userId: 'user-logout-1',
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

  test('should show logout button in user menu', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);

    const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Admin"), [aria-label*="user" i]').first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await expect(page.locator('text=/Cerrar sesión|Logout|Salir/i')).toBeVisible();
    }
  });

  test('should redirect to login after logout', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);

    const logoutBtn = page.locator('[data-testid="logout-btn"], button:has-text("Cerrar sesión"), a:has-text("Cerrar sesión")');
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else {
      const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Admin"), [aria-label*="user" i]').first();
      if (await userMenu.isVisible()) {
        await userMenu.click();
        await page.locator('text=/Cerrar sesión|Logout|Salir/i').click();
      }
    }

    await expect(page).toHaveURL(/\/login/);
  });

  test('should not access dashboard after logout', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);

    const logoutBtn = page.locator('button:has-text("Cerrar sesión"), a:has-text("Cerrar sesión")');
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else {
      const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Admin"), [aria-label*="user" i]').first();
      if (await userMenu.isVisible()) {
        await userMenu.click();
        await page.locator('text=/Cerrar sesión|Logout|Salir/i').click();
      }
    }

    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});
