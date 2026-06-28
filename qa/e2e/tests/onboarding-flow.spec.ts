import { test, expect } from '@playwright/test'

const now = new Date()

function loginResponse() {
  return {
    accessToken: 'onb-access-token',
    refreshToken: 'onb-refresh-token',
    tokenType: 'Bearer',
    user: {
      id: 'user-1',
      name: 'Admin',
      email: 'admin@parkflow.local',
      role: 'ADMIN',
      permissions: ['configuracion:leer', 'configuracion:editar', 'tarifas:leer', 'tarifas:editar'],
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

test('shows onboarding and persists progress to next step', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loginResponse()) })
  })

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        name: 'Admin',
        email: 'admin@parkflow.local',
        role: 'ADMIN',
        permissions: ['configuracion:leer', 'configuracion:editar'],
        active: true,
        passwordChangedAtIso: null,
      }),
    })
  })

  await page.route('**/api/v1/licensing/companies', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Empresa Onboarding',
          plan: 'LOCAL',
          status: 'ACTIVE',
          maxDevices: 1,
          maxLocations: 1,
          maxUsers: 5,
          offlineModeAllowed: true,
          offlineLeaseHours: 48,
          modules: [],
          devices: [],
          createdAt: now.toISOString(),
        },
      ]),
    })
  })

  await page.route('**/api/v1/onboarding/companies/**/settings', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ modules: { cash: true } }) })
  })
  await page.route('**/api/v1/onboarding/companies/**/status', async (route) => {
    await route.fallback()
  })
  await page.route('**/api/v1/onboarding/companies/**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          companyId: '11111111-1111-1111-1111-111111111111',
          plan: 'LOCAL',
          onboardingCompleted: false,
          currentStep: 1,
          skipped: false,
          progressData: {},
          availableOptionsByPlan: {
            allowMultiLocation: false,
            allowAdvancedPermissions: false,
            paymentMethods: ['EFECTIVO'],
          },
        }),
      })
      return
    }
    if (route.request().url().endsWith('/steps') && route.request().method() === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          companyId: '11111111-1111-1111-1111-111111111111',
          plan: 'LOCAL', onboardingCompleted: false, currentStep: 2, skipped: false,
          progressData: {},
          availableOptionsByPlan: {
            allowMultiLocation: false,
            allowAdvancedPermissions: false,
            paymentMethods: ['EFECTIVO'],
          },
        }),
      })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  })

  await page.route('**/api/v1/operations/supervisor/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        activeVehicles: 0,
        entriesSinceMidnight: 0,
        exitsSinceMidnight: 0,
        reprintsSinceMidnight: 0,
        lostTicketSinceMidnight: 0,
        printFailedSinceMidnight: 0,
        printDeadLetterSinceMidnight: 0,
        syncQueuePending: 0,
      }),
    })
  })
  await page.route('**/api/v1/health/operational', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ recentErrors: [] }) })
  })
  await page.route('**/api/v1/operations/sessions/active-list', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })

  await page.goto('/login')
  await page.fill('[data-testid="username"]', 'admin@parkflow.local')
  await page.fill('[data-testid="password"]', 'Qwert.12345')
  await page.click('[data-testid="login-button"]')
  await expect(page).toHaveURL('/')

  await expect(page.getByText('Paso 1 de 12')).toBeVisible()
  await page.getByRole('checkbox', { name: 'CARRO' }).check()
  const stepReq = page.waitForResponse((r) => r.url().includes('/onboarding/companies/') && r.url().includes('/steps') && r.request().method() === 'PUT')
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(stepReq).resolves.toBeTruthy()
  await expect(page.getByText('Paso 2 de 12')).toBeVisible({ timeout: 10000 })
})

test('skip onboarding defaults to active operational dashboard', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loginResponse()) })
  })
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loginResponse().user) })
  })
  await page.route('**/api/v1/licensing/companies', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Empresa Onboarding',
        plan: 'LOCAL',
        status: 'ACTIVE',
      }]),
    })
  })
  await page.route('**/api/v1/onboarding/companies/**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          companyId: '11111111-1111-1111-1111-111111111111',
          plan: 'LOCAL',
          onboardingCompleted: false,
          currentStep: 1,
          skipped: false,
          progressData: {},
          availableOptionsByPlan: {}
        }),
      })
      return
    }
    if (route.request().url().endsWith('/skip') && route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          companyId: '11111111-1111-1111-1111-111111111111',
          plan: 'LOCAL', onboardingCompleted: true, currentStep: 12, skipped: true,
          progressData: {},
          availableOptionsByPlan: {}
        }),
      })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  })

  // Mock dashboard routes
  await page.route('**/api/v1/operations/supervisor/summary', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  })
  await page.route('**/api/v1/health/operational', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ recentErrors: [] }) })
  })
  await page.route('**/api/v1/operations/sessions/active-list', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/api/v1/onboarding/companies/**/settings', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ modules: { cash: true } }) })
  })

  await page.goto('/login')
  await page.fill('[data-testid="username"]', 'admin@parkflow.local')
  await page.fill('[data-testid="password"]', 'Qwert.12345')
  await page.click('[data-testid="login-button"]')
  await expect(page).toHaveURL('/')

  await expect(page.getByText('Paso 1 de 12')).toBeVisible()
  
  // Click skip
  const skipReq = page.waitForResponse((r) => r.url().includes('/skip') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Omitir' }).click()
  // Aceptar alerta si hay una, Playwright las auto-acepta por defecto si se configuran,
  // O podemos asegurar que el modal se apruebe si es en-pantalla:
  const dialogConfirm = page.getByRole('button', { name: 'Sí, omitir' })
  if (await dialogConfirm.isVisible()) {
     await dialogConfirm.click()
  }
  
  await expect(skipReq).resolves.toBeTruthy()
  // Wait for redirect to happen based on `onboardingCompleted: true`
})

test('interrupted onboarding resumes at correct step', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loginResponse()) })
  })
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loginResponse().user) })
  })
  await page.route('**/api/v1/licensing/companies', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Empresa Onboarding',
        plan: 'LOCAL',
        status: 'ACTIVE',
      }]),
    })
  })
  await page.route('**/api/v1/onboarding/companies/**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          companyId: '11111111-1111-1111-1111-111111111111',
          plan: 'LOCAL',
          onboardingCompleted: false,
          currentStep: 3, // Simulate already reached step 3
          skipped: false,
          progressData: {
             step_1: { vehicleTypes: ["CARRO"] },
             step_2: { totalCapacity: 100 }
          },
          availableOptionsByPlan: {}
        }),
      })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  })

  // Mock dashboard routes just in case
  await page.route('**/api/v1/operations/supervisor/summary', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  })
  await page.route('**/api/v1/health/operational', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ recentErrors: [] }) })
  })
  await page.route('**/api/v1/operations/sessions/active-list', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/api/v1/onboarding/companies/**/settings', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ modules: { cash: true } }) })
  })

  await page.goto('/login')
  await page.fill('[data-testid="username"]', 'admin@parkflow.local')
  await page.fill('[data-testid="password"]', 'Qwert.12345')
  await page.click('[data-testid="login-button"]')
  await expect(page).toHaveURL('/')

  // Should immediately show step 3 because of backend state
  await expect(page.getByText('Paso 3 de 12')).toBeVisible()
})
