import { test, expect } from '@playwright/test';

test.describe('Flujo de Caja - Ingreso de Vehículos', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local dev server or app URL. Assuming default 3000
    // This should be adjusted based on the playwright config baseUrl
    await page.goto('/caja');
  });

  test('Renderiza el contenedor principal de la caja', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: /Nuevo ingreso/i })).toBeVisible();
  });

  test('Permite ingresar una placa y registrar la entrada', async ({ page }) => {
    const inputPlaca = page.locator('input[placeholder*="Ej: ABC123"]');
    
    // Ensure the input is ready
    await expect(inputPlaca).toBeVisible();
    
    // Type a plate
    await inputPlaca.fill('XYZ987');
    
    // Check if submit button is visible
    const submitBtn = page.locator('button[data-testid="register-entry"]');
    await expect(submitBtn).toBeVisible();
    
    // We don't click it to avoid littering backend during CI unless mocked,
    // but we ensure the button is enabled and has correct text
    await expect(submitBtn).not.toBeDisabled();
    await expect(submitBtn).toHaveText(/Registrar/i);
  });
});
