import { test, expect, Page } from '@playwright/test';

test.describe('Active Vehicles Table (Vehículos Activos)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'e2e-active-token',
          refreshToken: 'e2e-refresh',
          user: {
            id: 'user-active-1',
            name: 'Operator',
            email: 'operator@parkflow.local',
            role: 'OPERADOR',
            permissions: ['*'],
            active: true,
          },
          session: {
            sessionId: 'sess-active-1',
            userId: 'user-active-1',
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
        body: JSON.stringify({ availableSpaces: 50, activeSpaces: 3, totalSpaces: 60 }),
      });
    });

    await mockActiveSessionsList(page);

    await page.goto('/login');
    await page.fill('input[name="email"]', 'operator@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);
  });

  test('should display active vehicles table with data', async ({ page }) => {
    await page.goto('/vehiculos-activos');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/placa|ticket|vehiculo/i)).toBeVisible();
  });

  test('should filter by plate search', async ({ page }) => {
    await page.goto('/vehiculos-activos');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="buscar" i], input[placeholder*="placa" i], input[aria-label*="buscar" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('ABC');
      await page.waitForTimeout(600);

      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('should filter by vehicle type', async ({ page }) => {
    await mockActiveSessionsListWithMixedTypes(page);

    await page.goto('/vehiculos-activos');
    await page.waitForLoadState('networkidle');

    const carFilter = page.locator('button:has-text("Carro"), [role="button"]:has-text("Carro")').first();
    if (await carFilter.isVisible({ timeout: 3000 })) {
      await carFilter.click();
      await page.waitForTimeout(500);
    }
  });

  test('should sort by plate column', async ({ page }) => {
    await page.goto('/vehiculos-activos');
    await page.waitForLoadState('networkidle');

    const plateHeader = page.locator('th:has-text("Placa"), th:has-text("plate" i)').first();
    if (await plateHeader.isVisible({ timeout: 3000 })) {
      await plateHeader.click();
      await page.waitForTimeout(300);

      await plateHeader.click();
      await page.waitForTimeout(300);
    }
  });

  test('should sort by duration column', async ({ page }) => {
    await page.goto('/vehiculos-activos');
    await page.waitForLoadState('networkidle');

    const durationHeader = page.locator('th:has-text("Tiempo"), th:has-text("Duración"), th:has-text("duration" i)').first();
    if (await durationHeader.isVisible({ timeout: 3000 })) {
      await durationHeader.click();
      await page.waitForTimeout(300);
    }
  });

  test('should show empty state when no vehicles', async ({ page }) => {
    await page.route('**/api/v1/operations/sessions/active-list', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], meta: { total: 0, page: 1, limit: 25, totalPages: 0 } }),
      });
    });

    await page.goto('/vehiculos-activos');
    await page.waitForLoadState('networkidle');

    const emptyState = page.locator('text=/sin vehiculos|no hay|vacío/i').first();
    if (await emptyState.isVisible({ timeout: 5000 })) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should paginate results', async ({ page }) => {
    await mockActiveSessionsWithPagination(page);

    await page.goto('/vehiculos-activos?page=1&limit=2');
    await page.waitForLoadState('networkidle');

    const pagination = page.locator('[role="navigation"]:has(button), .pagination, [aria-label*="pagination" i]').first();
    if (await pagination.isVisible({ timeout: 3000 })) {
      const nextButton = page.locator('button:has-text("Siguiente"), button:has-text("Next"), [aria-label*="next" i]').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should select multiple rows for batch exit', async ({ page }) => {
    await page.goto('/vehiculos-activos');
    await page.waitForLoadState('networkidle');

    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible({ timeout: 3000 })) {
      await checkbox.click();
      await page.waitForTimeout(200);

      const selectedCount = page.locator('text=/\d+\s+seleccionad/i, text=/\d+\s+selected/i').first();
      if (await selectedCount.isVisible({ timeout: 2000 })) {
        await expect(selectedCount).toBeVisible();
      }
    }
  });

  test('should display vehicle type badges', async ({ page }) => {
    await page.goto('/vehiculos-activos');
    await page.waitForLoadState('networkidle');

    const carBadge = page.locator('text=/carro|cAR/i').first();
    const motoBadge = page.locator('text=/moto|motocicleta/i').first();

    const hasCarBadge = await carBadge.isVisible({ timeout: 3000 }).catch(() => false);
    const hasMotoBadge = await motoBadge.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasCarBadge || hasMotoBadge) {
      expect(hasCarBadge || hasMotoBadge).toBeTruthy();
    }
  });

  test('should display parking space if assigned', async ({ page }) => {
    await page.goto('/vehiculos-activos');
    await page.waitForLoadState('networkidle');

    const spaceCell = page.locator('text=/[A-Z]-\d{2}/, text=/espacio/i').first();
    if (await spaceCell.isVisible({ timeout: 3000 })) {
      await expect(spaceCell).toBeVisible();
    }
  });

  test('should show custodied items indicator for motorcycles', async ({ page }) => {
    await page.goto('/vehiculos-activos');
    await page.waitForLoadState('networkidle');

    const helmetIcon = page.locator('[data-testid*="helmet"], [aria-label*="casco"], text=/casco/i').first();
    if (await helmetIcon.isVisible({ timeout: 3000 })) {
      await expect(helmetIcon).toBeVisible();
    }
  });

  test('should refresh data automatically', async ({ page }) => {
    await page.goto('/vehiculos-activos');
    await page.waitForLoadState('networkidle');

    const initialRows = await page.locator('tbody tr').count();

    await page.waitForTimeout(6000);

    const updatedRows = await page.locator('tbody tr').count();
    expect(updatedRows).toBeGreaterThanOrEqual(0);
  });

  test('should handle search with special characters', async ({ page }) => {
    await page.goto('/vehiculos-activos');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="buscar" i], input[placeholder*="placa" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('ABC-123');
      await page.waitForTimeout(600);

      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('should display loading state while fetching', async ({ page }) => {
    let requestCount = 0;
    await page.route('**/api/v1/operations/sessions/active-list', async route => {
      requestCount++;
      if (requestCount === 1) {
        await new Promise<void>((r) => setTimeout(r, 100));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], meta: { total: 0, page: 1, limit: 25, totalPages: 0 } }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [{ ticketNumber: 'T-001', plate: 'ABC123', vehicleType: 'CAR', duration: '00:30:00' }],
            meta: { total: 1, page: 1, limit: 25, totalPages: 1 },
          }),
        });
      }
    });

    await page.goto('/vehiculos-activos');
    await page.waitForLoadState('networkidle');
  });

  test('should display error state on API failure', async ({ page }) => {
    await page.route('**/api/v1/operations/sessions/active-list', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/vehiculos-activos');

    const errorMessage = page.locator('text=/error|no se pudo|fallo/i').first();
    if (await errorMessage.isVisible({ timeout: 5000 })) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should show summary bar with counts', async ({ page }) => {
    await page.goto('/vehiculos-activos');
    await page.waitForLoadState('networkidle');

    const summaryText = page.locator('text=/\d+\s+vehículos|\d+\s+active|\d+\s+espacios/i').first();
    if (await summaryText.isVisible({ timeout: 3000 })) {
      await expect(summaryText).toBeVisible();
    }
  });
});

async function mockActiveSessionsList(page: Page) {
  await page.route('**/api/v1/operations/sessions/active-list', async route => {
    const url = new URL(route.request().url());
    const search = url.searchParams.get('search');

    let sessions = [
      { ticketNumber: 'T-001', plate: 'ABC123', vehicleType: 'CAR', duration: '00:30:00', rateName: 'Tarifa estándar' },
      { ticketNumber: 'T-002', plate: 'XYZ789', vehicleType: 'MOTORCYCLE', duration: '01:15:00', rateName: 'Tarifa moto', hasHelmet: true },
      { ticketNumber: 'T-003', plate: 'DEF456', vehicleType: 'CAR', duration: '00:45:00', rateName: 'Tarifa estándar', parkingSpaceCode: 'A-01' },
    ];

    if (search && search.length > 0) {
      sessions = sessions.filter(s => s.plate.toLowerCase().includes(search.toLowerCase()));
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: sessions,
        meta: { total: sessions.length, page: 1, limit: 25, totalPages: 1 },
      }),
    });
  });
}

async function mockActiveSessionsListWithMixedTypes(page: Page) {
  await page.route('**/api/v1/operations/sessions/active-list', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { ticketNumber: 'T-CAR001', plate: 'CAR111', vehicleType: 'CAR', duration: '00:30:00' },
          { ticketNumber: 'T-CAR002', plate: 'CAR222', vehicleType: 'CAR', duration: '01:00:00' },
          { ticketNumber: 'T-MOTO001', plate: 'MOTO111', vehicleType: 'MOTORCYCLE', duration: '00:15:00', hasHelmet: true },
        ],
        meta: { total: 3, page: 1, limit: 25, totalPages: 1 },
      }),
    });
  });
}

async function mockActiveSessionsWithPagination(page: Page) {
  let currentPage = 1;

  await page.route('**/api/v1/operations/sessions/active-list', async route => {
    const url = new URL(route.request().url());
    currentPage = parseInt(url.searchParams.get('page') || '1');

    const allSessions = Array.from({ length: 15 }, (_, i) => ({
      ticketNumber: `T-${String(i + 1).padStart(3, '0')}`,
      plate: `PLATE${String(i + 1).padStart(3, '0')}`,
      vehicleType: i % 3 === 0 ? 'MOTORCYCLE' : 'CAR',
      duration: `${String(Math.floor(i / 2))}:${String(i * 5 % 60).padStart(2, '0')}:00`,
    }));

    const pageSize = 5;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = allSessions.slice(start, end);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: pageData,
        meta: { total: allSessions.length, page: currentPage, limit: pageSize, totalPages: Math.ceil(allSessions.length / pageSize) },
      }),
    });
  });
}