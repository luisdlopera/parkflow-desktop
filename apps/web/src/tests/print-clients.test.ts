import { beforeEach, describe, expect, it } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";

import { TauriPrintClient } from "@/lib/print/print-clients";

describe("TauriPrintClient", () => {
  beforeEach(() => {
    clearMocks();
    window.localStorage.clear();
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      value: {},
      writable: true,
      configurable: true,
    });
  });

  it("probes the runtime and prints through invoke", async () => {
    const client = new TauriPrintClient();

    mockIPC((cmd, args) => {
      if (cmd === "print_escpos_ticket") {
        expect(args).toMatchObject({
          connection: expect.objectContaining({ type: "tcp" }),
          documentType: "ENTRY",
        });
        return {
          hardware_confirmed: true,
          status_byte: 16,
          status_hint: null,
          error: null,
        };
      }
    });

    await expect(client.probe()).resolves.toBe(true);
    await expect(
      client.print({
        idempotencyKey: "idem-1",
        documentType: "ENTRY",
        ticket: { id: "ticket-1" },
        clientOrigin: "http://localhost",
        operatorUserId: "user-1",
        terminalId: "TERM-1",
      })
    ).resolves.toMatchObject({
      channel: "tauri",
      warning: null,
    });
  });
});
