import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();

vi.mock("@/lib/api/fetch-with-credentials", () => ({
  fetchWithCredentials: mockFetch,
}));

describe("LocalAgentPrintClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("probe returns true when health endpoint returns ok", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    } as Response);

    const { LocalAgentPrintClient } = await import("../print-clients");
    const client = new LocalAgentPrintClient();

    const result = await client.probe();

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/health"),
      expect.any(Object)
    );
  });

  it("probe returns false when health endpoint returns non-ok", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as Response);

    const { LocalAgentPrintClient } = await import("../print-clients");
    const client = new LocalAgentPrintClient();

    const result = await client.probe();

    expect(result).toBe(false);
  });

  it("probe returns false when fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("Connection refused"));

    const { LocalAgentPrintClient } = await import("../print-clients");
    const client = new LocalAgentPrintClient();

    const result = await client.probe();

    expect(result).toBe(false);
  });

  it("print sends print job and returns path outcome", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jobId: "j1", result: { status: "printed" } }),
    } as Response);

    const { LocalAgentPrintClient } = await import("../print-clients");
    const client = new LocalAgentPrintClient();

    const outcome = await client.print({
      idempotencyKey: "ik-1",
      documentType: "ENTRY",
      ticket: { ticketId: "t1" } as any,
      clientOrigin: "http://localhost",
      operatorUserId: "u1",
      terminalId: "t1",
    });

    expect(outcome.channel).toBe("local_agent");
    if (outcome.channel === "local_agent") {
      expect(outcome.jobId).toBe("j1");
    }
  });

  it("print throws on HTTP error with error message from body", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Internal server error" }),
    } as Response);

    const { LocalAgentPrintClient } = await import("../print-clients");
    const client = new LocalAgentPrintClient();

    await expect(
      client.print({
        idempotencyKey: "ik-1",
        documentType: "ENTRY",
        ticket: { ticketId: "t1" } as any,
        clientOrigin: "http://localhost",
        operatorUserId: "u1",
        terminalId: "t1",
      })
    ).rejects.toThrow("Internal server error");
  });

  it("print throws fallback message when response body has no error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as Response);

    const { LocalAgentPrintClient } = await import("../print-clients");
    const client = new LocalAgentPrintClient();

    await expect(
      client.print({
        idempotencyKey: "ik-1",
        documentType: "ENTRY",
        ticket: { ticketId: "t1" } as any,
        clientOrigin: "http://localhost",
        operatorUserId: "u1",
        terminalId: "t1",
      })
    ).rejects.toThrow("print agent: HTTP 500");
  });

  it("print throws when response lacks result or jobId", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    const { LocalAgentPrintClient } = await import("../print-clients");
    const client = new LocalAgentPrintClient();

    await expect(
      client.print({
        idempotencyKey: "ik-1",
        documentType: "ENTRY",
        ticket: { ticketId: "t1" } as any,
        clientOrigin: "http://localhost",
        operatorUserId: "u1",
        terminalId: "t1",
      })
    ).rejects.toThrow("print agent: bad response");
  });

  it("print returns channel none when path is empty", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRINT_AGENT_DIRECT", "true");
    vi.stubEnv("NEXT_PUBLIC_PRINT_AGENT_URL", "");

    const { LocalAgentPrintClient } = await import("../print-clients");
    const client = new LocalAgentPrintClient();

    const outcome = await client.print({
      idempotencyKey: "ik-1",
      documentType: "ENTRY",
      ticket: { ticketId: "t1" } as any,
      clientOrigin: "http://localhost",
      operatorUserId: "u1",
      terminalId: "t1",
    });

    expect(outcome).toEqual({ channel: "none" });
  });
});

describe("NullPrintClient", () => {
  it("probe returns true", async () => {
    const { NullPrintClient } = await import("../print-clients");
    const client = new NullPrintClient();

    await expect(client.probe()).resolves.toBe(true);
  });

  it("print returns channel none", async () => {
    const { NullPrintClient } = await import("../print-clients");
    const client = new NullPrintClient();

    const outcome = await client.print({
      idempotencyKey: "ik-1",
      documentType: "ENTRY",
      ticket: { ticketId: "t1" } as any,
      clientOrigin: "http://localhost",
      operatorUserId: null,
      terminalId: null,
    });

    expect(outcome).toEqual({ channel: "none" });
  });
});

describe("createDefaultPrintContext", () => {
  afterEach(() => {
    globalThis.window = window;
  });

  it("creates context with clientOrigin from window", async () => {
    const { createDefaultPrintContext } = await import("../print-clients");
    const ctx = createDefaultPrintContext(
      { sessionId: "s1", receipt: { ticketNumber: "TN-1", plate: "ABC123" } },
      { idempotencyKey: "ik-1", documentType: "ENTRY", ticket: { ticketId: "t1" } as any }
    );

    expect(ctx.clientOrigin).toBe("http://localhost:3000");
    expect(ctx.idempotencyKey).toBe("ik-1");
    expect(ctx.documentType).toBe("ENTRY");
  });

  it("falls back to ssr origin when window is undefined", async () => {
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { createDefaultPrintContext } = await import("../print-clients");
    const ctx = createDefaultPrintContext(
      { sessionId: "s1", receipt: { ticketNumber: "TN-1", plate: "ABC123" } },
      { idempotencyKey: "ik-1", documentType: "ENTRY", ticket: { ticketId: "t1" } as any }
    );

    expect(ctx.clientOrigin).toBe("ssr");
  });
});

describe("TauriPrintClient", () => {
  it("probe returns false when __TAURI_INTERNALS__ is not in window", async () => {
    const { TauriPrintClient } = await import("../print-clients");
    const client = new TauriPrintClient();

    await expect(client.probe()).resolves.toBe(false);
  });
});
