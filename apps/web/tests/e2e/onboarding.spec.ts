import { test, expect } from '@playwright/test';

test.describe('Onboarding Wizard Flow', () => {
  // Configurar para usar un usuario con rol adecuado (Admin/Owner)
  // Asumiremos que el login redirige automáticamente al dashboard
  // y que podemos navegar a /admin/onboarding

  test.beforeEach(async ({ page }) => {
    // Autenticación inicial
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');
    
    // Esperar redirección al dashboard
    await expect(page).toHaveURL(/\/$/);
  });

  test('Happy Path Completo: Debería poder navegar y completar los 12 pasos', async ({ page }) => {
    // 1. Navegar al onboarding
    await page.goto('/admin/onboarding');
    
    // Validar que estamos en el Step 1
    await expect(page.locator('text=/Tipos de Vehículo|Vehicle Types/i').first()).toBeVisible();

    const stepsCount = 12;
    for (let i = 1; i < stepsCount; i++) {
      const btnNext = page.locator('button:has-text("Siguiente"), button:has-text("Continuar")').first();
      
      if (await btnNext.isVisible() && await btnNext.isEnabled()) {
         await btnNext.click();
      }
      
      // Esperar un breve momento para la transición
      await page.waitForTimeout(500); 
    }

    // Al llegar al paso final (Resumen / Step 12), presionar "Completar" o "Finalizar"
    const btnComplete = page.locator('button:has-text("Finalizar"), button:has-text("Completar")').first();
    if (await btnComplete.isVisible()) {
      await btnComplete.click();
    }

    // Validar que, después de finalizar, redirige al dashboard o muestra éxito
    await expect(page).toHaveURL(/\/$/);
  });

  test('Autosave y Reload: Debería mantener el progreso y restaurar el estado tras recargar', async ({ page }) => {
    // 1. Navegar al onboarding
    await page.goto('/admin/onboarding');
    
    // Avanzar al paso 2
    const btnNext = page.locator('button:has-text("Siguiente"), button:has-text("Continuar")').first();
    await btnNext.click();
    
    // Validar que estamos en el Paso 2 (Capacidad)
    await expect(page.locator('text=/Capacidad|Capacity/i').first()).toBeVisible();

    // Esperar a que el Autosave dispare (ej. interceptar POST /progress)
    // Para simplificar, esperamos un tiempo prudencial
    await page.waitForTimeout(2000); 

    // Recargar la página
    await page.reload();

    // Validar que volvemos al Paso 2, no al 1
    await expect(page.locator('text=/Capacidad|Capacity/i').first()).toBeVisible();
  });

  test('Error de Red y Fallo 500: Debería manejar errores de servidor y prevenir avance', async ({ page }) => {
    // Interceptar la petición de guardado para simular un 500
    await page.route('**/api/v1/onboarding/companies/*/steps', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error (Simulado)' })
      });
    });

    await page.goto('/admin/onboarding');
    
    // Intentar avanzar al paso 2
    const btnNext = page.locator('button:has-text("Siguiente"), button:has-text("Continuar")').first();
    await btnNext.click();
    
    // Al fallar la petición (por el 500), no debería dejar avanzar.
    // Podríamos validar si se muestra un toast o si el paso actual sigue siendo "Vehicle Types"
    await expect(page.locator('text=/Tipos de Vehículo|Vehicle Types/i').first()).toBeVisible();
    
    // Remover la ruta mockeada
    await page.unroute('**/api/v1/onboarding/companies/*/steps');
  });
});
