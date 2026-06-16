import { test, expect, Page } from "@playwright/test";

test.describe("Exit Flow (Salida y Cobro)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "e2e-exit-token",
          refreshToken: "e2e-refresh",
          user: {
            id: "user-exit-1",
            name: "Cashier",
            email: "cashier@parkflow.local",
            role: "CAJERO",
            permissions: ["*"],
            active: true,
          },
          session: {
            sessionId: "sess-exit-1",
            userId: "user-exit-1",
            deviceId: "test-device",
            accessTokenExpiresAtIso: new Date(Date.now() + 86400000).toISOString(),
          },
          offlineLease: null,
        }),
      });
    });

    await page.route("**/api/v1/configuration/vehicle-types", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "1", code: "CAR", name: "Carro", isActive: true, requiresPlate: true, quickAccess: true },
          { id: "2", code: "MOTORCYCLE", name: "Moto", isActive: true, requiresPlate: true, quickAccess: true },
        ]),
      });
    });

    await page.route("**/api/v1/parking-spaces/summary", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ availableSpaces: 50, activeSpaces: 10, totalSpaces: 60 }),
      });
    });

    // Mock cash register status
    await page.route("**/api/v1/cash/current*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "cash-sess-1",
          status: "open",
          openingAmount: 500000,
          currentBalance: 500000,
        }),
      });
    });

    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', "cashier@parkflow.local");
    await page.fill('input[name="password"]', "Qwert.12345");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);
  });

  // =========================================================================
  // HAPPY PATH: Complete exit flow
  // =========================================================================

  test("should complete full exit flow with cash payment", async ({ page }) => {
    await mockActiveSessionLookup(page, "T-100", "CAR", "ABC123", 4000);
    await mockExitRegistration(page);

    await page.goto("/salida-cobro");
    await page.waitForSelector('input[label*="Número de ticket" i]');

    // Search by ticket
    await page.fill('input[label*="Número de ticket" i]', "T-100");
    await page.keyboard.press("Enter");

    // Wait for session data to appear
    await expect(page.locator("text=Total a pagar")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=$4,000")).toBeVisible();

    // Select CASH payment (already default)
    await page.click('button:has-text("Efectivo")');

    // Enter cash received
    const cashInput = page.locator('input[label*="Recibido" i]');
    await cashInput.fill("5000");

    // Verify change displayed
    await expect(page.locator("text=$1,000")).toBeVisible({ timeout: 5000 });

    // Process exit
    await page.click('button:has-text("Cobrar")');

    // Wait for success
    await expect(page.locator("text=Salida registrada")).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // MOTORCYCLE EXIT WITH HELMET RETURN
  // =========================================================================

  test("should complete motorcycle exit with helmet return confirmation", async ({ page }) => {
    await mockActiveSessionLookup(page, "T-200", "MOTORCYCLE", "ABC12D", 1500, [
      { id: "helmet-1", itemType: "HELMET", identifier: "L-01", status: "RECEIVED", receivedByName: "Operator", receivedAt: new Date().toISOString() },
    ]);
    await mockExitRegistration(page);

    await page.goto("/salida-cobro");
    await page.waitForSelector('input[label*="Número de ticket" i]');

    // Search by ticket
    await page.fill('input[label*="Número de ticket" i]', "T-200");
    await page.keyboard.press("Enter");

    // Verify helmet alert is shown
    await expect(page.locator("text=¡ATENCIÓN! Elementos custodiados")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Casco")).toBeVisible();

    // Verify checkbox is pre-checked (returnConfirmedIds set by default)
    const checkbox = page.locator('input[aria-label*="Confirmar devolución" i]');
    await expect(checkbox).toBeChecked();

    // Process exit
    await page.click('button:has-text("Efectivo")');
    await page.click('button:has-text("Cobrar")');

    // Wait for success
    await expect(page.locator("text=Salida registrada")).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // EXIT WITH SPLIT PAYMENT
  // =========================================================================

  test("should process split payment (MIXED)", async ({ page }) => {
    await mockActiveSessionLookup(page, "T-300", "CAR", "XYZ789", 10000);
    await mockExitRegistration(page);

    await page.goto("/salida-cobro");

    // Search and find session
    await page.fill('input[label*="Número de ticket" i]', "T-300");
    await page.keyboard.press("Enter");
    await expect(page.locator("text=Total a pagar")).toBeVisible({ timeout: 10000 });

    // Select MIXED payment
    await page.click('button:has-text("Mixto")');

    // Fill split payment amounts
    const cashSplitInput = page.locator('input[label*="Valor"]').first();
    await cashSplitInput.fill("5000");
    const cardSplitInput = page.locator('input[label*="Valor"]').nth(1);
    await cardSplitInput.fill("5000");

    // Process exit
    await page.click('button:has-text("Cobrar")');
    await expect(page.locator("text=Salida registrada")).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // LOST TICKET FLOW
  // =========================================================================

  test("should process lost ticket", async ({ page }) => {
    await mockActiveSessionLookup(page, "T-400", "CAR", "LST999", 15000);
    await mockLostTicketProcessing(page);

    await page.goto("/salida-cobro");

    // Search and find session
    await page.fill('input[label*="Número de ticket" i]', "T-400");
    await page.keyboard.press("Enter");
    await expect(page.locator("text=Total a pagar")).toBeVisible({ timeout: 10000 });

    // Click lost ticket button
    await page.click('button:has-text("Ticket perdido")');
    await expect(page.locator("text=Ticket perdido procesado")).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // ERROR: Session not found
  // =========================================================================

  test("should show error when session not found", async ({ page }) => {
    await page.route("**/api/v1/operations/sessions/active*", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "No se encontro sesion activa" }),
      });
    });

    await page.goto("/salida-cobro");
    await page.fill('input[label*="Número de ticket" i]', "T-INVALID");
    await page.keyboard.press("Enter");

    await expect(page.locator("text=No se encontro sesion activa")).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // ERROR: Cash register not open
  // =========================================================================

  test("should show cash modal when cash not open", async ({ page }) => {
    await page.route("**/api/v1/cash/current*", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Caja no abierta" }),
      });
    });

    await page.goto("/salida-cobro");
    await expect(page.locator("text=Caja no abierta")).toBeVisible({ timeout: 10000 });
  });
});

// =========================================================================
// HELPERS
// =========================================================================

async function mockActiveSessionLookup(
  page: Page,
  ticketNumber: string,
  vehicleType: string,
  plate: string,
  totalAmount: number,
  custodiedItems: Array<Record<string, unknown>> = []
) {
  await page.route(`**/api/v1/operations/sessions/active*`, async (route) => {
    const url = route.request().url();
    const params = new URL(url).searchParams;
    const reqTicket = params.get("ticketNumber");

    if (reqTicket === ticketNumber) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sessionId: `session-${ticketNumber}`,
          subtotal: totalAmount,
          surcharge: 0,
          discount: 0,
          deductedMinutes: 0,
          total: totalAmount,
          receipt: {
            ticketNumber,
            plate,
            vehicleType,
            site: "Test Site",
            lane: "L1",
            booth: "B1",
            terminal: "TERM1",
            entryAt: new Date(Date.now() - 7200000).toISOString(),
            duration: "2h 0m",
            totalAmount,
            rateName: "Tarifa estándar",
            status: "ACTIVE",
            lostTicket: false,
            reprintCount: 0,
            entryMode: "VISITOR",
            monthlySession: false,
            hasHelmet: custodiedItems.length > 0,
            custodiedItems,
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "No se encontro sesion activa" }),
      });
    }
  });
}

async function mockExitRegistration(page: Page) {
  await page.route("**/api/v1/operations/exits", async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sessionId: `session-${body.ticketNumber || "unknown"}`,
        receipt: {
          ticketNumber: body.ticketNumber || "T-UNKNOWN",
          plate: body.plate || "ABC123",
          vehicleType: "CAR",
          site: "Test Site",
          status: "CLOSED",
          totalAmount: body.total || 4000,
          duration: "2h 0m",
          entryAt: new Date(Date.now() - 7200000).toISOString(),
          exitAt: new Date().toISOString(),
        },
        message: "Salida registrada",
        subtotal: 4000,
        surcharge: 0,
        discount: 0,
        total: 4000,
      }),
    });
  });
}

async function mockLostTicketProcessing(page: Page) {
  await page.route("**/api/v1/operations/tickets/lost", async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sessionId: `session-${body.ticketNumber || "unknown"}`,
        receipt: {
          ticketNumber: body.ticketNumber || "T-400",
          plate: "LST999",
          vehicleType: "CAR",
          status: "LOST_TICKET",
          totalAmount: 15000,
          lostTicket: true,
        },
        message: "Ticket perdido procesado",
        subtotal: 10000,
        surcharge: 5000,
        discount: 0,
        total: 15000,
      }),
    });
  });
}
