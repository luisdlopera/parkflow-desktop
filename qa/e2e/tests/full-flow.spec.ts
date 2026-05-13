import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test('complete parking management flow', async ({ page }) => {
  const terminalId = `TERM-E2E-${Date.now()}`
  const plate = `E2E${Date.now()}`

  await page.addInitScript((id) => {
    localStorage.setItem('parkflow_terminal_id', id)
  }, terminalId)

  await loginAsAdmin(page)

  const createdRate = await page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem('parkflow.auth.session') || 'null')
    const e2eSite = `Test Site E2E ${Date.now()}`
    const listResponse = await fetch('http://localhost:6011/api/v1/settings/rates?page=0&size=1', {
      headers: {
        'X-API-Key': 'dev-api-key-123',
        Authorization: `Bearer ${session.accessToken}`,
      },
    })
    if (listResponse.ok) {
      const listBody = await listResponse.json()
      if (Array.isArray(listBody.content) && listBody.content.length > 0) {
        return listBody.content[0]
      }
    }

    const response = await fetch('http://localhost:6011/api/v1/settings/rates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'dev-api-key-123',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        name: `Tarifa E2E ${Date.now()}`,
        vehicleType: 'CAR',
        rateType: 'HOURLY',
        amount: 2000,
        graceMinutes: 0,
        toleranceMinutes: 0,
        fractionMinutes: 60,
        roundingMode: 'UP',
        lostTicketSurcharge: 0,
        active: true,
        site: e2eSite,
        baseValue: 0,
        baseMinutes: 0,
        additionalValue: 0,
        additionalMinutes: 0,
        maxDailyValue: 20000,
        appliesNight: false,
        appliesHoliday: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create rate: ${response.status}`)
    }

    return await response.json()
  })

  const session = await page.evaluate(() => JSON.parse(localStorage.getItem('parkflow.auth.session') || 'null'))
  const cashSession = await page.evaluate(async ({ accessToken, session, terminalId }) => {
    const response = await fetch('http://localhost:6011/api/v1/cash/open', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'dev-api-key-123',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        site: 'CI',
        terminal: terminalId,
        registerLabel: 'Register E2E',
        openingAmount: 0,
        operatorUserId: session.user.id,
        openIdempotencyKey: `open:${terminalId}`,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to open cash: ${response.status}`)
    }

    return await response.json()
  }, { accessToken: session.accessToken, session, terminalId })

  await page.goto('/caja')
  await expect(page.locator('[data-testid="cash-status"]')).toContainText('Caja abierta')

  const entryResponse = await page.evaluate(async ({ accessToken, session, rateId, terminalId, plate }) => {
    const response = await fetch('http://localhost:6011/api/v1/operations/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'dev-api-key-123',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        plate,
        type: 'CAR',
        rateId,
        operatorUserId: session.user.id,
        entryAt: '2026-05-08T10:00:00Z',
        site: 'CI',
        lane: 'L1',
        booth: 'B1',
        terminal: terminalId,
        idempotencyKey: `entry:${terminalId}`,
        observations: 'Ingreso E2E'
      }),
    })
    return await response.json()
  }, { accessToken: session.accessToken, session, rateId: createdRate.id, terminalId, plate })
  const ticketNumber = entryResponse.receipt?.ticketNumber ?? entryResponse.ticketNumber ?? entryResponse.session?.ticketNumber
  expect(ticketNumber).toBeTruthy()

  await page.goto('/salida-cobro')
  await page.fill('[data-testid="ticket-number"]', ticketNumber)
  await page.click('[data-testid="search-session"]')
  await expect(page.getByText(/Sesion Activa|Sesion activa/)).toBeVisible()
  const exitResult = await page.evaluate(async ({ accessToken, session, terminalId, ticketNumber }) => {
    const response = await fetch('http://localhost:6011/api/v1/operations/exits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'dev-api-key-123',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        ticketNumber,
        paymentMethod: 'CASH',
        operatorUserId: session.user.id,
        terminal: terminalId,
        idempotencyKey: `exit:${terminalId}`,
        observations: 'Salida E2E',
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to exit vehicle: ${response.status}`)
    }

    return await response.json()
  }, { accessToken: session.accessToken, session, terminalId, ticketNumber })

  expect(exitResult.message).toBe('Salida registrada')

  await page.evaluate(async ({ accessToken, cashSession, exitResult }) => {
    const response = await fetch(`http://localhost:6011/api/v1/cash/sessions/${cashSession.id}/count`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'dev-api-key-123',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        countCash: Number(exitResult.total ?? exitResult.subtotal ?? 0),
        countCard: 0,
        countTransfer: 0,
        countOther: 0,
        observations: 'Arqueo E2E',
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to count cash: ${response.status}`)
    }
  }, { accessToken: session.accessToken, cashSession, exitResult })

  const closedSession = await page.evaluate(async ({ accessToken, cashSession }) => {
    const response = await fetch(`http://localhost:6011/api/v1/cash/sessions/${cashSession.id}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'dev-api-key-123',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        closingNotes: 'Cierre E2E',
        closeIdempotencyKey: `close:${cashSession.id}`,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to close cash: ${response.status}`)
    }

    return await response.json()
  }, { accessToken: session.accessToken, cashSession })

  expect(closedSession.status).toBe('CLOSED')

  const currentStatus = await page.evaluate(async ({ accessToken, terminalId }) => {
    const response = await fetch(`http://localhost:6011/api/v1/cash/current?site=CI&terminal=${terminalId}`, {
      headers: {
        'X-API-Key': 'dev-api-key-123',
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return response.status
  }, { accessToken: session.accessToken, terminalId })

  expect(currentStatus).toBe(404)
})
