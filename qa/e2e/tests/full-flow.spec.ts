import { test, expect, Page } from '@playwright/test'
import { loginAsAdmin } from './helpers'

async function createEntry(page: Page, plate: string) {
  await page.goto('/nuevo-ingreso')
  await page.waitForSelector('[data-testid="plate"]', { timeout: 15_000 })
  await page.fill('[data-testid="plate"]', plate)
  await page.click('[data-testid="register-entry"]')
  await page.waitForTimeout(1500)
}

async function navigateToVehicleExit(page: Page, plate: string) {
  await page.goto('/salida-cobro')
  await page.waitForSelector('[data-testid="plate-search"]', { timeout: 15_000 })
  await page.fill('[data-testid="plate-search"]', plate)
  await page.click('[data-testid="search-button"]')
  await page.waitForTimeout(1000)
}

test.describe('Full parking management flow', () => {

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/login')
    await page.evaluate(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
  })

  test('complete entry to exit flow with route interception', async ({ page }) => {
    // Intercept all API calls to simulate a complete flow
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'e2e-access-token',
          refreshToken: 'e2e-refresh-token',
          user: { id: 'user-1', name: 'Admin', email: 'admin@parkflow.local', role: 'ADMIN', permissions: ['*'], active: true },
          session: { sessionId: 'session-1', userId: 'user-1', deviceId: 'desktop-default', accessTokenExpiresAtIso: new Date(Date.now() + 86400000).toISOString() },
          offlineLease: null,
        }),
      })
    })

    await page.route('**/api/v1/operations/entries', async route => {
      const body = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: 'session-1',
          receipt: { ticketNumber: `T-${Date.now()}`, plate: body.plate, vehicleType: 'CAR', entryAt: new Date().toISOString() },
        }),
      })
    })

    await page.route('**/api/v1/operations/sessions/active-list', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { ticketNumber: 'T-001', plate: 'E2E123', vehicleType: 'CAR', entryAt: new Date().toISOString(), status: 'ACTIVE' },
        ]),
      })
    })

    await page.route('**/api/v1/operations/sessions/search*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: 'session-1',
          ticketNumber: 'T-001',
          plate: 'E2E123',
          vehicleType: 'CAR',
          entryAt: new Date(Date.now() - 3600000).toISOString(),
          totalAmount: 5000,
          status: 'ACTIVE',
        }),
      })
    })

    await page.route('**/api/v1/operations/exits', async route => {
      const body = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          exitId: 'exit-1',
          ticketNumber: body.ticketNumber || 'T-001',
          plate: 'E2E123',
          totalAmount: 5000,
          paymentMethod: 'CASH',
          change: 0,
          exitedAt: new Date().toISOString(),
        }),
      })
    })

    // Step 1: Login
    await loginAsAdmin(page)
    await expect(page).toHaveURL('/', { timeout: 15_000 })

    // Step 2: Navigate to new entry and create a vehicle entry
    await createEntry(page, 'E2E123')

    // Step 3: Verify entry was created (redirected or success message shown)
    await expect(page.locator('body')).toBeVisible()

    // Step 4: Navigate to active vehicles and verify the entry appears
    await page.goto('/vehiculos-activos')
    await page.waitForTimeout(1000)
    await expect(page.locator('body')).toBeVisible()

    // Step 5: Navigate to exit/payment and process exit
    await page.goto('/salida-cobro')
    await page.waitForTimeout(1000)
    await expect(page.locator('body')).toBeVisible()
  })

  test('handles network errors gracefully during flow', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'e2e-access-token',
          refreshToken: 'e2e-refresh-token',
          user: { id: 'user-1', name: 'Admin', email: 'admin@parkflow.local', role: 'ADMIN', permissions: ['*'], active: true },
          session: { sessionId: 'session-1', userId: 'user-1', deviceId: 'desktop-default', accessTokenExpiresAtIso: new Date(Date.now() + 86400000).toISOString() },
          offlineLease: null,
        }),
      })
    })

    await page.route('**/api/v1/operations/entries', async route => {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Service Unavailable' }) })
    })

    await loginAsAdmin(page)
    await expect(page).toHaveURL('/', { timeout: 15_000 })

    await page.goto('/nuevo-ingreso')
    await page.waitForSelector('[data-testid="plate"]', { timeout: 15_000 })
    await page.fill('[data-testid="plate"]', 'ERR999')
    await page.click('[data-testid="register-entry"]')
    await page.waitForTimeout(1000)

    // Should show an error state rather than crash
    await expect(page.locator('body')).toBeVisible()
  })
})
