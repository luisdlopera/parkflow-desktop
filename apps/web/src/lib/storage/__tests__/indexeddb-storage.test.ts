import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockEnqueueCash = vi.fn();
const mockListPending = vi.fn();
const mockMarkError = vi.fn();
const mockRemoveRow = vi.fn();
const mockEnqueuePrint = vi.fn();
const mockGetJob = vi.fn();
const mockMarkDone = vi.fn();
const mockMarkRetry = vi.fn();
const mockQueueStats = vi.fn();

vi.mock("@/lib/cash/cash-outbox-idb", () => ({
  enqueueCashMovementOffline: mockEnqueueCash,
  listCashOutboxPending: mockListPending,
  markCashOutboxError: mockMarkError,
  removeCashOutboxRow: mockRemoveRow,
}));

vi.mock("@/lib/print/print-queue-idb", () => ({
  enqueueLocalPrint: mockEnqueuePrint,
  getJobById: mockGetJob,
  markJobDone: mockMarkDone,
  markJobRetryOrDead: mockMarkRetry,
  listQueueStats: mockQueueStats,
}));

describe("IndexedDBStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("outboxEnqueue delegates to cash outbox for CASH_MOVEMENT events", async () => {
    const { IndexedDBStorage } = await import("../indexeddb-storage");
    const storage = new IndexedDBStorage();

    const id = await storage.outboxEnqueue({
      idempotencyKey: "idem-1",
      eventType: "CASH_MOVEMENT",
      payload: { sessionId: "s1", amount: 50000, type: "CASH_IN" },
      origin: "OFFLINE_PENDING_SYNC",
      status: "pending",
      retryCount: 0,
    });

    expect(id).toMatch(/^cash:s1:/);
    expect(mockEnqueueCash).toHaveBeenCalledWith("s1", { sessionId: "s1", amount: 50000, type: "CASH_IN" });
  });

  it("outboxEnqueue throws for unsupported event types", async () => {
    const { IndexedDBStorage } = await import("../indexeddb-storage");
    const storage = new IndexedDBStorage();

    await expect(
      storage.outboxEnqueue({
        idempotencyKey: "idem-2",
        eventType: "ENTRY_RECORDED",
        payload: {},
        origin: "OFFLINE_PENDING_SYNC",
        status: "pending",
        retryCount: 0,
      })
    ).rejects.toThrow("IndexedDB outbox not implemented for event type");
  });

  it("outboxClaimPending returns rows mapped to OutboxItem", async () => {
    mockListPending.mockResolvedValue([
      { id: "r1", sessionId: "s1", payloadJson: JSON.stringify({ type: "CASH_MOVEMENT", idempotencyKey: "ik1" }), attempts: 0, lastError: null },
      { id: "r2", sessionId: "s1", payloadJson: JSON.stringify({ type: "CASH_MOVEMENT" }), attempts: 12, lastError: "Dead" },
    ]);

    const { IndexedDBStorage } = await import("../indexeddb-storage");
    const storage = new IndexedDBStorage();

    const items = await storage.outboxClaimPending(10);

    expect(items).toHaveLength(2);
    expect(items[0].status).toBe("pending");
    expect(items[1].status).toBe("failed");
  });

  it("outboxMarkSynced delegates to removeCashOutboxRow", async () => {
    const { IndexedDBStorage } = await import("../indexeddb-storage");
    const storage = new IndexedDBStorage();

    await storage.outboxMarkSynced("cash:r1:123");

    expect(mockRemoveRow).toHaveBeenCalledWith("r1");
  });

  it("outboxMarkFailed delegates to markCashOutboxError", async () => {
    const { IndexedDBStorage } = await import("../indexeddb-storage");
    const storage = new IndexedDBStorage();

    await storage.outboxMarkFailed("cash:r2:456", "API error");

    expect(mockMarkError).toHaveBeenCalledWith("r2", "API error");
  });

  it("outboxGetStats computes counts based on attempts", async () => {
    mockListPending.mockResolvedValue([
      { id: "r1", attempts: 0, lastError: null },
      { id: "r2", attempts: 5, lastError: null },
      { id: "r3", attempts: 10, lastError: null },
      { id: "r4", attempts: 15, lastError: "Dead error" },
    ]);

    const { IndexedDBStorage } = await import("../indexeddb-storage");
    const storage = new IndexedDBStorage();

    const stats = await storage.outboxGetStats();

    expect(stats.pending).toBe(2);
    expect(stats.failed).toBe(1);
    expect(stats.dead).toBe(1);
  });

  it("updates and retrieves connectivity state", async () => {
    const { IndexedDBStorage } = await import("../indexeddb-storage");
    const storage = new IndexedDBStorage();

    vi.stubGlobal("navigator", { onLine: false });
    await storage.updateConnectivityState(false, "offline");

    const state = await storage.getConnectivityState();
    expect(state.isOnline).toBe(false);
    expect(state.lastError).toBe("offline");
  });
});
