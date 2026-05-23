import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test.skip('complete parking management flow', async ({ page }) => {
  // This test requires a real API backend and is skipped in CI
  // To run locally, start the API with: pnpm dev:api
})
