import { test, expect, Page } from "@playwright/test";

test.describe("Cash Register (Caja)", () => {
  test("should test if /caja hangs with login", async ({ page }) => {
    test.setTimeout(120000);
    page.on("console", (msg) => {
      console.log(`[browser] ${msg.text()}`);
    });
    
    await page.route("**/*", async (route, request) => {
      if (request.url().includes("/api/v1/")) {
        console.log("-> REQUEST:", request.method(), request.url());
      }
      await route.fallback();
    });

    await page.route("**/api/v1/cash/current*", async (route) => {
      console.log("Mocked /cash/current hit!");
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ message: "No active cash register" }),
      });
    });

    await page.route("**/api/v1/cash/policy*", async (route) => {
      console.log("Mocked /cash/policy hit!");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          requireOpenForPayment: true,
          allowManualMovements: true,
          offlineOpenAllowed: true,
          offlineCloseAllowed: true,
          offlineMaxManualMovement: 500000,
          operationsHint: "Operaciones locales",
          resolvedForSite: "default",
        }),
      });
    });

    await page.route("**/api/v1/cash/registers*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "1", site: "default", terminal: "TERM-1", status: "CLOSED", description: "Caja Principal" },
        ]),
      });
    });

    await page.route("**/api/v1/auth/login", async (route) => {
      console.log("Mocked /auth/login hit!");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "e2e-caja-token",
          user: {
            id: "1",
            name: "Cashier",
            email: "cashier@parkflow.local",
            role: "CASHIER",
            onboardingCompleted: true,
            requirePasswordChange: false,
          },
        }),
      });
    });

    await page.route("**/api/v1/auth/restore-session", async (route) => {
      console.log("Mocked /auth/restore-session hit!");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "e2e-caja-token",
          user: {
            id: "1",
            name: "Cashier",
            email: "cashier@parkflow.local",
            role: "CASHIER",
            onboardingCompleted: true,
            requirePasswordChange: false,
          },
          expiresAt: Date.now() + 3600000,
        }),
      });
    });

    // Set terminal id so CajaClient doesn't hang loading
    await page.addInitScript(() => {
      window.localStorage.setItem("parkflow_terminal_id", "TERM-1");
    });

    // Set up a session via context cookie
    await page.context().addCookies([
      {
        name: "parkflow_session",
        value: "dummy-token",
        domain: "localhost",
        path: "/",
      }
    ]);

    // Mock /auth/me or whatever it needs
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: "1",
          name: "Cashier",
          email: "cashier@parkflow.local",
          role: "CASHIER",
          onboardingCompleted: true,
          requirePasswordChange: false,
          permissions: [
            "cierres_caja:abrir",
            "cierres_caja:cerrar",
            "cobros:registrar",
            "anulaciones:crear",
            "reportes:leer"
          ]
        })
      });
    });

    console.log("GOTO /caja directly");
    await page.goto("/caja");
    
    // Wait for the specific text
    try {
      await expect(page.getByText("No hay una caja abierta en este terminal.")).toBeVisible({ timeout: 5000 });
      console.log("TEXT IS VISIBLE!");
    } catch (e) {
      console.log("TEXT NOT VISIBLE!");
    }
    
    // Dump HTML without evaluate
    const bodyText = await page.locator("body").innerText();
    console.log("BODY TEXT:\n", bodyText);
    const html = await page.locator("body").innerHTML();
    console.log("BODY HTML:\n", html);
    
    // Fail immediately
    expect(true).toBe(false);

    // Start a background interception for /cash/open so we can see when it hits
    await page.route("**/api/v1/cash/open", async (route) => {
      console.log("Mocked /cash/open hit!");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "sess-123",
          terminal: "TERM-1",
          operator: "cashier1",
          status: "OPEN",
          openedAt: new Date().toISOString(),
          initialAmount: 100000,
        }),
      });
    });

    const openButton = page.getByRole("button", { name: "Abrir caja" });
    await openButton.click();

    // After open, we expect the step "Movimientos" to be visible
    await expect(page.getByText("Turno en curso")).toBeVisible();
  });
});
