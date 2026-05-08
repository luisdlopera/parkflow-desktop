import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('accessibility audit - login page', async ({ page }) => {
  await page.goto('/login')

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze()

  expect(accessibilityScanResults.violations).toEqual([])
})