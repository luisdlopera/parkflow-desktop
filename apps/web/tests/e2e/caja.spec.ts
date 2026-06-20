import { test, expect } from "@playwright/test";

test.describe("Cash Register (Caja)", () => {
  test("should test if /caja hangs with login", async ({ page }) => {
    test.setTimeout(60000);

    await page.route("**/api/v1/cash/current*", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ message: "No active cash register" }),
      });
    });

    await page.route("**/api/v1/cash/policy*", async (route) => {
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
        body: JSON.stringify({
          content: [
            { id: "1", site: "default", terminal: "TERM-1", status: "CLOSED", description: "Caja Principal", label: "Caja Principal" },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 20,
          page: 0
        }),
      });
    });

    await page.route("**/api/v1/auth/login", async (route) => {
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

    await page.addInitScript(() => {
      window.localStorage.setItem("parkflow_terminal_id", "TERM-1");
    });

    await page.context().addCookies([
      {
        name: "parkflow_session",
        value: "dummy-token",
        domain: "localhost",
        path: "/",
      }
    ]);

    await page.goto("/caja");

    // We expect the terminal to be loaded and to be in the CLOSED state (since current cash returns 404)
    // There should be a message or button indicating that there is no active session and we need to open one.
    await expect(page.getByText("No hay una caja abierta en este terminal.")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /Apertura de Caja|Abrir Caja/i })).toBeVisible();
  });
});
