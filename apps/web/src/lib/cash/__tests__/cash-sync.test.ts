import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCashAddMovement = vi.fn();
const mockListPending = vi.fn();
const mockMarkError = vi.fn();
const mockRemoveRow = vi.fn();

vi.mock("@/lib/cash/cash-api", () => ({
  cashAddMovement: mockCashAddMovement,
}));

vi.mock("@/lib/cash/cash-outbox-idb", () => ({
  listCashOutboxPending: mockListPending,
  markCashOutboxError: mockMarkError,
  removeCashOutboxRow: mockRemoveRow,
}));

describe("flushCashMovementOutbox", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("processes pending movements and marks them synced", async () => {
    const pendingRows = [
      {
        id: "row-1",
        sessionId: "session-1",
        payloadJson: JSON.stringify({
          type: "CASH_IN",
          paymentMethod: "CASH",
          amount: 50000,
          reason: "Ingreso inicial",
          idempotencyKey: "idem-1",
        }),
        attempts: 0,
        lastError: null,
      },
      {
        id: "row-2",
        sessionId: "session-1",
        payloadJson: JSON.stringify({
          type: "CASH_OUT",
          paymentMethod: "CARD",
          amount: 25000,
          idempotencyKey: null,
        }),
        attempts: 0,
        lastError: null,
      },
    ];

    mockListPending.mockResolvedValue(pendingRows);
    mockCashAddMovement.mockResolvedValue({ id: "mov-1" });

    const { flushCashMovementOutbox } = await import("../cash-sync");
    const result = await flushCashMovementOutbox();

    expect(result).toEqual({ synced: 2, failed: 0 });
    expect(mockCashAddMovement).toHaveBeenCalledTimes(2);
    expect(mockRemoveRow).toHaveBeenCalledTimes(2);
    expect(mockRemoveRow).toHaveBeenCalledWith("row-1");
    expect(mockRemoveRow).toHaveBeenCalledWith("row-2");
  });

  it("skips processing when offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });

    const { flushCashMovementOutbox } = await import("../cash-sync");
    const result = await flushCashMovementOutbox();

    expect(result).toEqual({ synced: 0, failed: 0 });
    expect(mockListPending).not.toHaveBeenCalled();
  });

  it("falls back to outbox id as idempotency key when none provided", async () => {
    const pendingRows = [
      {
        id: "row-no-idem",
        sessionId: "session-2",
        payloadJson: JSON.stringify({
          type: "CASH_IN",
          paymentMethod: "CASH",
          amount: 10000,
          idempotencyKey: null,
        }),
        attempts: 0,
        lastError: null,
      },
    ];

    mockListPending.mockResolvedValue(pendingRows);
    mockCashAddMovement.mockResolvedValue({ id: "mov-2" });

    const { flushCashMovementOutbox } = await import("../cash-sync");
    const result = await flushCashMovementOutbox();

    expect(result).toEqual({ synced: 1, failed: 0 });
    expect(mockCashAddMovement).toHaveBeenCalledWith("session-2", {
      type: "CASH_IN",
      paymentMethod: "CASH",
      amount: 10000,
      reason: null,
      idempotencyKey: "outbox:row-no-idem",
    });
  });

  it("handles API errors and marks outbox row as error", async () => {
    const pendingRows = [
      {
        id: "row-error",
        sessionId: "session-3",
        payloadJson: JSON.stringify({
          type: "CASH_IN",
          paymentMethod: "CASH",
          amount: 5000,
        }),
        attempts: 0,
        lastError: null,
      },
    ];

    mockListPending.mockResolvedValue(pendingRows);
    mockCashAddMovement.mockRejectedValue(new Error("API Error: 500"));

    const { flushCashMovementOutbox } = await import("../cash-sync");
    const result = await flushCashMovementOutbox();

    expect(result).toEqual({ synced: 0, failed: 1 });
    expect(mockMarkError).toHaveBeenCalledWith("row-error", "API Error: 500");
    expect(mockRemoveRow).not.toHaveBeenCalled();
  });

  it("handles non-Error rejection messages", async () => {
    const pendingRows = [
      {
        id: "row-str",
        sessionId: "session-4",
        payloadJson: JSON.stringify({
          type: "CASH_IN",
          paymentMethod: "CASH",
          amount: 3000,
        }),
        attempts: 0,
        lastError: null,
      },
    ];

    mockListPending.mockResolvedValue(pendingRows);
    mockCashAddMovement.mockRejectedValue("Network error string");

    const { flushCashMovementOutbox } = await import("../cash-sync");
    const result = await flushCashMovementOutbox();

    expect(result).toEqual({ synced: 0, failed: 1 });
    expect(mockMarkError).toHaveBeenCalledWith("row-str", "Network error string");
  });
});
