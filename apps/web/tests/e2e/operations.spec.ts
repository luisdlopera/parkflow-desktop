import { test, expect } from '@playwright/test';

test.describe('Parking Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept API calls to avoid real backend dependency
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'e2e-token',
          refreshToken: 'e2e-refresh',
          user: { id: 'user-1', name: 'Admin', email: 'admin@parkflow.local', role: 'ADMIN', permissions: ['*'], active: true },
          session: { sessionId: 'sess-1', userId: 'user-1', deviceId: 'test-device', accessTokenExpiresAtIso: new Date(Date.now() + 86400000).toISOString() },
          offlineLease: null,
        }),
      });
    });

    await page.route('**/api/v1/configuration/vehicle-types', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: "1", code: "CAR", name: "Carro", isActive: true, requiresPlate: true, quickAccess: true },
          { id: "2", code: "MOTORCYCLE", name: "Moto", isActive: true, requiresPlate: true, quickAccess: true },
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

    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);
  });

  test('should complete a basic parking entry', async ({ page }) => {
    await page.goto('/');
    const plateInput = page.locator('input[placeholder*="placa" i]');
    if (await plateInput.isVisible()) {
        await plateInput.fill('QA-789');
        await page.keyboard.press('Enter');
        await expect(page.locator('text=/Ingreso|Registrado|Éxito/i')).toBeVisible();
    }
  });

  test.describe('Motorcycle Entry', () => {
    test('should register a motorcycle with valid plate ABC12D', async ({ page }) => {
      await page.route('**/api/v1/operations/entries', async route => {
        const body = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'moto-session-1',
            receipt: {
              ticketNumber: 'T-20260513-000300',
              plate: body.plate || 'ABC12D',
              vehicleType: 'MOTORCYCLE',
              entryAt: new Date().toISOString(),
            },
            message: 'Ingreso registrado',
          }),
        });
      });

      await page.goto('/nuevo-ingreso');
      await page.waitForSelector('[data-testid="plate"]', { timeout: 15000 });
      await page.fill('[data-testid="plate"]', 'ABC12D');

      await page.route('**/api/v1/operations/entries', async route => {
        const body = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'moto-session-1',
            receipt: {
              ticketNumber: 'T-20260513-000300',
              plate: 'ABC12D',
              vehicleType: 'MOTORCYCLE',
              entryAt: new Date().toISOString(),
            },
            message: 'Ingreso registrado',
          }),
        });
      });

      const submitBtn = page.locator('[data-testid="register-entry"]');
      await submitBtn.click();

      await expect(page.locator('text=/Ingreso registrado|Éxito/i')).toBeVisible({ timeout: 5000 });
    });

    test('should show validation error for invalid motorcycle plate ABC123', async ({ page }) => {
      await page.goto('/nuevo-ingreso');
      await page.waitForSelector('[data-testid="plate"]', { timeout: 15000 });
      await page.fill('[data-testid="plate"]', 'ABC123');

      const submitBtn = page.locator('[data-testid="register-entry"]');
      await submitBtn.click();

      await expect(page.locator('text=/corresponde a carro|formato inválido/i')).toBeVisible({ timeout: 5000 });
    });

    test('should handle duplicate motorcycle plate error (409)', async ({ page }) => {
      await page.route('**/api/v1/operations/entries', async route => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            errorCode: 'OPERATION_ERROR',
            userMessage: 'El vehiculo ya tiene una sesion activa',
          }),
        });
      });

      await page.goto('/nuevo-ingreso');
      await page.waitForSelector('[data-testid="plate"]', { timeout: 15000 });
      await page.fill('[data-testid="plate"]', 'DUP12M');

      const submitBtn = page.locator('[data-testid="register-entry"]');
      await submitBtn.click();

      await expect(page.locator('text=/ya tiene una entrada activa|sesion activa/i')).toBeVisible({ timeout: 5000 });
    });

    test('should handle network error gracefully for motorcycle entry', async ({ page }) => {
      await page.route('**/api/v1/operations/entries', async route => {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Service Unavailable' }) });
      });

      await page.goto('/nuevo-ingreso');
      await page.waitForSelector('[data-testid="plate"]', { timeout: 15000 });
      await page.fill('[data-testid="plate"]', 'ERR12M');

      const submitBtn = page.locator('[data-testid="register-entry"]');
      await submitBtn.click();

      await expect(page.locator('text=/error|no se pudo|intentar/i')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="plate"]')).toBeVisible();
    });
  });
});
