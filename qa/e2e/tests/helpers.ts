import { expect, type Page } from '@playwright/test'

const MOCK_SESSION = {
  accessToken: 'e2e-access-token',
  refreshToken: 'e2e-refresh-token',
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
    issuedAtIso: new Date().toISOString(),
    accessTokenExpiresAtIso: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
    refreshTokenExpiresAtIso: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
    lastSeenAtIso: new Date().toISOString(),
  },
  device: {
    id: 'device-1',
    displayName: 'Caja principal',
    platform: 'desktop',
    fingerprint: 'local-dev',
    authorized: true,
    revokedAtIso: null,
    lastSeenAtIso: new Date().toISOString(),
  },
  offlineLease: null,
}

export async function loginAsAdmin(page: Page) {
  // Bypass login by setting session directly in localStorage
  await page.goto('/login')
  await page.evaluate((session) => {
    window.localStorage.setItem('parkflow.auth.session', JSON.stringify(session))
  }, MOCK_SESSION)
  await page.goto('/')
  await expect(page).toHaveURL('/', { timeout: 15_000 })
}
