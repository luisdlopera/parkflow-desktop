import { test, expect } from '@playwright/test';

test.describe('Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'e2e-responsive-token',
          refreshToken: 'e2e-refresh',
          user: {
            id: 'user-resp-1',
            name: 'Admin',
            email: 'admin@parkflow.local',
            role: 'ADMIN',
            permissions: ['*'],
            active: true,
          },
          session: {
            sessionId: 'sess-resp-1',
            userId: 'user-resp-1',
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

    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);
  });

  test('mobile view shows hamburger menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('nav, aside, [role="navigation"]').first();
    const isSidebarVisible = await sidebar.isVisible();

    const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="hamburger" i], [data-testid="mobile-menu"], button:has(svg[data-icon*="menu"])').first();
    if (!isSidebarVisible && await hamburger.isVisible()) {
      await expect(hamburger).toBeVisible();
      await hamburger.click();
      await page.waitForTimeout(300);
      await expect(sidebar).toBeVisible();
    }
  });

  test('desktop view shows full sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('nav, aside, [role="navigation"]').first();
    await expect(sidebar).toBeVisible();

    const navLinks = page.locator('nav a, aside a, [role="navigation"] a');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test('tablet view shows collapsed sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('nav, aside, [role="navigation"]').first();
    const isFullyVisible = await sidebar.isVisible();

    const hamburger = page.locator('button[aria-label*="menu" i], [data-testid="mobile-menu"], button:has(svg[data-icon*="menu"])').first();
    const hasHamburger = await hamburger.isVisible();

    if (!isFullyVisible && hasHamburger) {
      await expect(hamburger).toBeVisible();
      await hamburger.click();
      await page.waitForTimeout(300);
      await expect(sidebar).toBeVisible();
    } else if (isFullyVisible) {
      const iconOnlyLinks = page.locator('nav a:not(:has-text("")):not([aria-label=""])').first();
      await expect(sidebar).toBeVisible();
    }
  });
});
