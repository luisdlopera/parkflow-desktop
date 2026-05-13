import { test, expect } from '@playwright/test'

test.skip(({ browserName, isMobile }) => browserName === 'webkit' || isMobile, 'Auth flow relies on the hydrated Next.js client; local WebKit/mobile projects do not hydrate it reliably in this dev-server config.')

const now = new Date()

function loginResponse() {
  return {
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
  }
}

async function routeDashboardApis(page: import('@playwright/test').Page) {
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
    expect(route.request().headers().authorization).toBe('Bearer e2e-access-token')
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

test.beforeEach(async ({ page, context }) => {
  await context.clearCookies()
  await page.addInitScript(() => window.localStorage.clear())
  await page.goto('/login')
  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
})

test('redirects protected dashboard to login when no session exists', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login\?next=%2F/, { timeout: 15_000 })
  await expect(page.getByTestId('login-button')).toBeVisible()
})

test('shows validation error when password is missing', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('login-button').click({ force: true })
  await expect(page.getByTestId('error-message')).toContainText('Debes ingresar la contrasena', { timeout: 15_000 })
})

test('shows invalid credential error on login rejection', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async route => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'AUTH_INVALID_CREDENTIALS', message: 'Credenciales invalidas' }),
    })
  })

  await page.goto('/login')
  await page.getByTestId('password').fill('wrong-password')
  await page.getByTestId('login-button').click({ force: true })
  await expect(page.getByTestId('error-message')).toContainText('No fue posible iniciar sesión', { timeout: 15_000 })
})

test('login flow stores session and loads dashboard with auth headers', async ({ page }) => {
  await routeDashboardApis(page)
  await page.route('**/api/v1/auth/login', async route => {
    const body = await route.request().postDataJSON()
    expect(body).toMatchObject({
      email: 'admin@parkflow.local',
      password: 'Qwert.12345',
      deviceId: 'dev-device-001',
      offlineRequestedHours: 48,
    })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loginResponse()) })
  })

  await page.goto('/login')
  await page.getByTestId('username').fill('admin@parkflow.local')
  await page.getByTestId('password').fill('Qwert.12345')
  await page.getByTestId('login-button').click({ force: true })

  await expect(page).toHaveURL('/', { timeout: 15_000 })
  await expect(page.getByTestId('summary-loaded')).toBeVisible()
  await expect(page.locator('body')).toContainText('Vision general del parqueadero')

  const stored = await page.evaluate(() => window.localStorage.getItem('parkflow.auth.session'))
  expect(stored).toContain('e2e-access-token')
})

test('login respects next query after successful authentication', async ({ page }) => {
  await routeDashboardApis(page)
  await page.route('**/api/v1/auth/login', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loginResponse()) })
  })

  await page.goto('/login?next=%2Fcaja')
  await page.getByTestId('password').fill('Qwert.12345')
  await page.getByTestId('login-button').click({ force: true })

  await expect(page).toHaveURL('/caja', { timeout: 15_000 })
})
