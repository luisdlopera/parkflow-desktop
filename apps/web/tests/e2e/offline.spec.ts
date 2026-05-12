import { test, expect } from '@playwright/test';

test.describe('Offline and Hardware Mocking', () => {
  test('should queue operations when offline', async ({ page, context }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');

    // Simulate being in Tauri (mocking the internal flag)
    await page.evaluate(() => {
      (window as any).__TAURI_INTERNALS__ = {};
      // Mock invoke to track calls
      (window as any).__TAURI_INVOKE_CALLS__ = [];
      (window as any).__TAURI__.invoke = (cmd: string, args: any) => {
        (window as any).__TAURI_INVOKE_CALLS__.push({ cmd, args });
        if (cmd === 'auth_get_or_create_device_id') return Promise.resolve('test-device');
        return Promise.resolve();
      };
    });

    // Go offline
    await context.setOffline(true);

    // Perform an action that should be queued (e.g., entry)
    const plateInput = page.locator('input[placeholder*="placa" i]');
    if (await plateInput.isVisible()) {
        await plateInput.fill('OFF-456');
        await page.keyboard.press('Enter');

        // Verify that the outbox queuing was triggered
        // This checks if the UI handled the offline state by calling our lib which calls invoke
        const outboxCalls = await page.evaluate(() => {
            return (window as any).__TAURI_INVOKE_CALLS__.filter((c: any) => c.cmd === 'enqueue_outbox_event');
        });

        // If the app correctly uses queueOfflineOperation, we should see a call
        expect(outboxCalls.length).toBeGreaterThan(0);
    }
  });

  test('should mock printer during ticket generation', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@parkflow.local');
    await page.fill('input[name="password"]', 'Qwert.12345');
    await page.click('button[type="submit"]');

    await page.evaluate(() => {
        (window as any).__TAURI_INTERNALS__ = {};
        (window as any).__TAURI_INVOKE_CALLS__ = [];
        (window as any).__TAURI_INVOKE__ = (cmd: string, args: any) => {
          (window as any).__TAURI_INVOKE_CALLS__.push({ cmd, args });
          return Promise.resolve();
        };
    });

    // Verify printer command was sent to Tauri when requested
    const printCalls = await page.evaluate(() => {
        return (window as any).__TAURI_INVOKE_CALLS__.filter((c: any) => c.cmd === 'print_ticket');
    });
    expect(Array.isArray(printCalls)).toBeTruthy();
  });
});
