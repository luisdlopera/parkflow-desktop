import { test, expect } from '@playwright/test'

test('complete parking management flow', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.fill('[data-testid="username"]', 'admin')
  await page.fill('[data-testid="password"]', 'admin123')
  await page.click('[data-testid="login-button"]')
  await expect(page).toHaveURL('/dashboard')

  // Open cash register
  await page.click('[data-testid="open-cash"]')
  await page.fill('[data-testid="initial-amount"]', '0')
  await page.click('[data-testid="confirm-open"]')
  await expect(page.locator('[data-testid="cash-status"]')).toHaveText('OPEN')

  // Register vehicle entry
  await page.click('[data-testid="new-entry"]')
  await page.fill('[data-testid="plate"]', 'ABC123')
  await page.selectOption('[data-testid="vehicle-type"]', 'CAR')
  await page.click('[data-testid="register-entry"]')
  await expect(page.locator('[data-testid="entry-success"]')).toBeVisible()

  // Register vehicle exit
  await page.click('[data-testid="new-exit"]')
  await page.fill('[data-testid="ticket-number"]', 'TICKET001')
  await page.selectOption('[data-testid="payment-method"]', 'CASH')
  await page.click('[data-testid="register-exit"]')
  await expect(page.locator('[data-testid="exit-success"]')).toBeVisible()

  // Close cash register
  await page.click('[data-testid="close-cash"]')
  await page.click('[data-testid="confirm-close"]')
  await expect(page.locator('[data-testid="cash-status"]')).toHaveText('CLOSED')
})