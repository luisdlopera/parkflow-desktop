import { expect, type Page } from '@playwright/test'

async function setupApiMocks(page: Page) {
  const now = new Date()
  
  await page.route('**/api/v1/auth/login', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'e2e-access-token',
        refreshToken: 'e2e-refresh-token',
        tokenType: 'Bearer',
        user: {
          id: 'user-1',
          name: 'Admin',
          email: 'admin@parkflow.local',
          role: 'ADMIN',
          permissions: ['tickets:emitir', 'configuracion:leer', 'cierres_caja:abrir', 'cierres_caja:cerrar', 'cobros:registrar'],
          active: true,
          passwordChangedAtIso: null,
        },
        session: {
          sessionId: 'session-1',
          userId: 'user-1',
          deviceId: 'desktop-default',
          issuedAtIso: now.toISOString(),
          accessTokenExpiresAtIso: new Date(now.getTime() + 15 * 60_000).toISOString(),
          refreshTokenExpiresAtIso: new Date(now.getTime() + 7 * 24 * 60 * 60_000).toISOString(),
          lastSeenAtIso: now.toISOString(),
        },
        device: {
          id: 'device-1',
          displayName: 'Caja principal',
          platform: 'desktop',
          fingerprint: 'local-dev',
          authorized: true,
          revokedAtIso: null,
          lastSeenAtIso: now.toISOString(),
        },
        offlineLease: null,
      }),
    })
  })

  await page.route('**/api/v1/auth/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        name: 'Admin',
        email: 'admin@parkflow.local',
        role: 'ADMIN',
        permissions: ['tickets:emitir', 'configuracion:leer', 'cierres_caja:abrir', 'cierres_caja:cerrar', 'cobros:registrar'],
        active: true,
        passwordChangedAtIso: null,
      }),
    })
  })

  await page.route('**/api/v1/operations/supervisor/summary', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        activeVehicles: 2,
        entriesSinceMidnight: 5,
        exitsSinceMidnight: 3,
        reprintsSinceMidnight: 0,
        lostTicketSinceMidnight: 0,
        printFailedSinceMidnight: 0,
        printDeadLetterSinceMidnight: 0,
        syncQueuePending: 0,
        failedEvents: 0,
        deadLetter: 0,
        lastSuccessfulSync: now.toISOString(),
        openCashRegisters: 1,
        recentErrors: [],
      }),
    })
  })

  await page.route('**/api/v1/health/operational', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        overallStatus: 'OK',
        apiStatus: 'OK',
        databaseStatus: 'OK',
        printerStatus: 'OK',
        lastHeartbeat: now.toISOString(),
        outboxPending: 0,
        failedEvents: 0,
        deadLetter: 0,
        lastSuccessfulSync: now.toISOString(),
        openCashRegisters: 1,
        recentErrors: [],
      }),
    })
  })

  await page.route('**/api/v1/cash/policy*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        requireOpenForPayment: true,
        offlineCloseAllowed: false,
        offlineMaxManualMovement: 500000,
        operationsHint: 'Abra caja en el mismo terminal que el cobro',
        resolvedForSite: 'CI',
      }),
    })
  })

  await page.route('**/api/v1/cash/registers*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })

  await page.route('**/api/v1/cash/current*', async route => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'No hay caja abierta' }) })
  })

  await page.route('**/api/v1/operations/sessions/active-list', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
}

export async function loginAsAdmin(page: Page) {
  await setupApiMocks(page)
  await page.goto('/login')
  await page.fill('[data-testid="username"]', 'admin@parkflow.local')
  await page.fill('[data-testid="password"]', 'Qwert.12345')
  await page.click('[data-testid="login-button"]')
  await expect(page).toHaveURL('/', { timeout: 15_000 })
}
