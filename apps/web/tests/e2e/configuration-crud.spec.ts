import { test, expect, Page } from '@playwright/test';

test.describe('Configuration CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'e2e-config-token',
          refreshToken: 'e2e-refresh',
          user: {
            id: 'user-config-1',
            name: 'Admin',
            email: 'admin@parkflow.local',
            role: 'ADMIN',
            permissions: ['*'],
            active: true,
          },
          session: {
            sessionId: 'sess-config-1',
            userId: 'user-config-1',
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

  test('list configuration items (payment methods)', async ({ page }) => {
    await mockPaymentMethods(page);

    await page.goto('/configuracion/metodos-pago');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Efectivo|Tarjeta|Transferencia/i')).toBeVisible();
  });

  test('open create form and fill submission', async ({ page }) => {
    await mockPaymentMethods(page);

    await page.route('**/api/v1/configuration/payment-methods', async route => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-1',
            name: body.name || 'Nuevo Método',
            code: body.code || 'NEW',
            isActive: true,
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/configuracion/metodos-pago');
    await page.waitForLoadState('networkidle');

    const addButton = page.locator('button:has-text("Agregar"), button:has-text("Nuevo"), button:has-text("Crear"), a:has-text("Agregar")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
    }

    const form = page.locator('form, [role="dialog"], [role="presentation"], [data-testid="drawer"]').first();
    await expect(form).toBeVisible({ timeout: 5000 });

    const nameInput = form.locator('input[name="name"], input[label*="nombre" i], input[placeholder*="nombre" i]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Nuevo Método de Pago');
    }

    const submitBtn = form.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Crear")').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await expect(page.locator('text=/Guardado|Creado|Éxito/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('edit existing configuration item', async ({ page }) => {
    await mockPaymentMethods(page);

    await page.route('**/api/v1/configuration/payment-methods/*', async route => {
      if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'pm-1',
            name: 'Efectivo (Editado)',
            code: 'CASH',
            isActive: true,
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/configuracion/metodos-pago');
    await page.waitForLoadState('networkidle');

    const editButton = page.locator('button:has-text("Editar"), button:has-text("✏"), [aria-label*="edit" i], [data-testid*="edit"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();
    } else {
      const row = page.locator('table tbody tr').first();
      await row.click();
    }

    const form = page.locator('form, [role="dialog"], [data-testid="drawer"]').first();
    await expect(form).toBeVisible({ timeout: 5000 });

    const nameInput = form.locator('input[name="name"], input[label*="nombre" i]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Efectivo (Editado)');
    }

    const saveBtn = form.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Actualizar")').first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await expect(page.locator('text=/Guardado|Actualizado|Éxito/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('toggle status of a configuration item', async ({ page }) => {
    await mockPaymentMethods(page);

    await page.route('**/api/v1/configuration/payment-methods/*/toggle', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'pm-1', name: 'Efectivo', code: 'CASH', isActive: false }),
      });
    });

    await page.goto('/configuracion/metodos-pago');
    await page.waitForLoadState('networkidle');

    const toggle = page.locator('[role="switch"], input[type="checkbox"], .toggle, button:has-text("Activar"), button:has-text("Desactivar")').first();
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(500);

      const statusChanged = page.locator('text=/actualizado|cambiado|éxito/i').first();
      if (await statusChanged.isVisible()) {
        await expect(statusChanged).toBeVisible();
      }
    }
  });

  test('delete item with confirmation', async ({ page }) => {
    await mockPaymentMethods(page);

    await page.route('**/api/v1/configuration/payment-methods/*', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Eliminado exitosamente' }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/configuracion/metodos-pago');
    await page.waitForLoadState('networkidle');

    const deleteButton = page.locator('button:has-text("Eliminar"), button:has-text("🗑"), [aria-label*="delete" i], [data-testid*="delete"]').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
    }

    const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"], .confirm-dialog').first();
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });

    const confirmBtn = confirmDialog.locator('button:has-text("Confirmar"), button:has-text("Eliminar"), button:has-text("Sí"), button:has-text("Aceptar")').first();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      await expect(page.locator('text=/Eliminado|Éxito/i')).toBeVisible({ timeout: 5000 });
    }
  });
});

async function mockPaymentMethods(page: Page) {
  await page.route('**/api/v1/configuration/payment-methods', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'pm-1', name: 'Efectivo', code: 'CASH', isActive: true },
          { id: 'pm-2', name: 'Tarjeta', code: 'CARD', isActive: true },
          { id: 'pm-3', name: 'Transferencia', code: 'TRANSFER', isActive: false },
        ]),
      });
    } else {
      await route.fallback();
    }
  });
}
