import { expect, type Page } from '@playwright/test'

export async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.fill('[data-testid="username"]', 'admin@parkflow.local')
  await page.fill('[data-testid="password"]', 'Qwert.12345')
  await page.click('[data-testid="login-button"]')
  await expect(page).toHaveURL('/')
}
