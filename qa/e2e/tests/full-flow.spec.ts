import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test('complete parking management flow', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('parkflow_terminal_id', 'TERM-E2E')
  })

  await loginAsAdmin(page)

  await page.goto('/caja')
  await page.fill('[data-testid="initial-amount"]', '0')
  await page.click('[data-testid="open-cash"]')
  await expect(page.locator('[data-testid="cash-status"]')).toContainText('Caja abierta')

  const session = await page.evaluate(() => JSON.parse(localStorage.getItem('parkflow.auth.session') || 'null'))
  const entryResponse = await page.evaluate(async ({ accessToken, session }) => {
    const response = await fetch('http://localhost:6011/api/v1/operations/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'dev-api-key-123',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        plate: 'ABC123',
        type: 'CAR',
        rateId: '10000000-0000-0000-0000-000000000001',
        operatorUserId: session.user.id,
        entryAt: '2026-05-08T10:00:00Z',
        site: 'CI',
        lane: 'L1',
        booth: 'B1',
        terminal: 'TERM-E2E'
      }),
    })
    return await response.json()
  }, { accessToken: session.accessToken, session })
  const ticketNumber = entryResponse.receipt.ticketNumber
  expect(ticketNumber).toBeTruthy()

  await page.goto('/salida-cobro')
  await page.fill('[data-testid="ticket-number"]', ticketNumber)
  await page.click('[data-testid="search-session"]')
  await expect(page.getByText(/Sesion Activa|Sesion activa/)).toBeVisible()
  await page.click('[data-testid="payment-cash"]')
  await expect(page.getByText(/Salida registrada/)).toBeVisible()

  await page.goto('/caja')
  await page.click('[data-testid="confirm-close"]')
  await expect(page.locator('[data-testid="cash-status"]')).toContainText('Caja cerrada')
})
