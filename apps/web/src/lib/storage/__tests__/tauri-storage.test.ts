import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockTauriInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockTauriInvoke,
}));

describe("TauriStorage", () => {
  let TauriStorage: new () => import("../tauri-storage").TauriStorage;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../tauri-storage");
    TauriStorage = mod.TauriStorage;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("outboxEnqueue calls tauri invoke and returns string id", async () => {
    mockTauriInvoke.mockResolvedValue({ id: 42 });

    const storage = new TauriStorage();
    const id = await storage.outboxEnqueue({
      idempotencyKey: "ik-1",
      eventType: "CASH_MOVEMENT",
      payload: { amount: 100 },
      origin: "OFFLINE_PENDING_SYNC",
      status: "pending",
      retryCount: 0,
    });

    expect(id).toBe("42");
    expect(mockTauriInvoke).toHaveBeenCalledWith("enqueue_outbox_event", {
      request: {
        idempotency_key: "ik-1",
        event_type: "CASH_MOVEMENT",
        payload_json: JSON.stringify({ amount: 100 }),
        origin: "OFFLINE_PENDING_SYNC",
        user_id: undefined,
        device_id: undefined,
        auth_session_id: undefined,
      },
    });
  });

  it("outboxClaimPending maps tauri result to OutboxItem", async () => {
    mockTauriInvoke.mockResolvedValue([
      {
        id: 1,
        idempotency_key: "ik-1",
        event_type: "CASH_MOVEMENT",
        payload_json: JSON.stringify({ amount: 500 }),
        origin: "OFFLINE_PENDING_SYNC",
        status: "pending",
        retry_count: 0,
        created_at_unix_ms: 1000,
      },
    ]);

    const storage = new TauriStorage();
    const items = await storage.outboxClaimPending(10);

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("1");
    expect(items[0].idempotencyKey).toBe("ik-1");
    expect(items[0].eventType).toBe("CASH_MOVEMENT");
    expect(items[0].payload).toEqual({ amount: 500 });
  });

  it("outboxMarkSynced calls tauri invoke with parsed id", async () => {
    mockTauriInvoke.mockResolvedValue(undefined);

    const storage = new TauriStorage();
    await storage.outboxMarkSynced("42");

    expect(mockTauriInvoke).toHaveBeenCalledWith("mark_outbox_synced", { outbox_id: 42 });
  });

  it("outboxMarkFailed calls tauri invoke", async () => {
    mockTauriInvoke.mockResolvedValue(undefined);

    const storage = new TauriStorage();
    await storage.outboxMarkFailed("99", "Error reason");

    expect(mockTauriInvoke).toHaveBeenCalledWith("mark_outbox_failed", { outbox_id: 99 });
  });

  it("outboxGetStats returns stats from detail method", async () => {
    mockTauriInvoke.mockResolvedValue({
      pending: 5,
      processing: 2,
      failed: 1,
      dead_letter: 1,
      synced: 100,
    });

    const storage = new TauriStorage();
    const stats = await storage.outboxGetStats();

    expect(stats).toEqual({ pending: 5, failed: 1, dead: 1 });
  });

  it("outboxGetDetailedStats returns full stats from tauri", async () => {
    mockTauriInvoke.mockResolvedValue({
      pending: 3,
      processing: 1,
      failed: 2,
      dead_letter: 1,
      synced: 50,
    });

    const storage = new TauriStorage();
    const stats = await storage.outboxGetDetailedStats();

    expect(stats).toEqual({ pending: 3, processing: 1, failed: 2, deadLetter: 1, synced: 50 });
  });

  it("printEnqueue calls tauri invoke", async () => {
    mockTauriInvoke.mockResolvedValue({ id: "print-1" });

    const storage = new TauriStorage();
    const id = await storage.printEnqueue({
      idempotencyKey: "pk-1",
      documentType: "ENTRY",
      ticket: { ticketId: "t1" },
      attempts: 0,
      maxAttempts: 12,
      status: "pending",
      nextRetryAt: 0,
      sessionId: "s1",
      operatorUserId: "u1",
    });

    expect(id).toBe("print-1");
    expect(mockTauriInvoke).toHaveBeenCalledWith("queue_print_job", expect.any(Object));
  });

  it("printClaimNext returns first pending job", async () => {
    mockTauriInvoke.mockResolvedValue([
      { id: "j1", document_type: "ENTRY", idempotency_key: "ik-1", status: "pending", attempts: 0 },
      { id: "j2", document_type: "EXIT", idempotency_key: "ik-2", status: "synced", attempts: 1 },
    ]);

    const storage = new TauriStorage();
    const job = await storage.printClaimNext();

    expect(job).not.toBeNull();
    expect(job!.id).toBe("j1");
    expect(job!.documentType).toBe("ENTRY");
  });

  it("printClaimNext returns null when no pending jobs", async () => {
    mockTauriInvoke.mockResolvedValue([]);

    const storage = new TauriStorage();
    const job = await storage.printClaimNext();

    expect(job).toBeNull();
  });

  it("printMarkDone calls tauri invoke", async () => {
    mockTauriInvoke.mockResolvedValue(undefined);

    const storage = new TauriStorage();
    await storage.printMarkDone("j1");

    expect(mockTauriInvoke).toHaveBeenCalledWith("update_print_job_status", {
      request: { job_id: "j1", status: "Acked", message: null, attempt_key: null },
    });
  });

  it("printMarkRetryOrDead marks DeadLetter after 11+ attempts", async () => {
    mockTauriInvoke
      .mockResolvedValueOnce([{ id: "j1", attempts: 11 }])
      .mockResolvedValueOnce(undefined);

    const storage = new TauriStorage();
    await storage.printMarkRetryOrDead("j1", "Too many retries");

    expect(mockTauriInvoke).toHaveBeenLastCalledWith("update_print_job_status", {
      request: { job_id: "j1", status: "DeadLetter", message: "Too many retries", attempt_key: null },
    });
  });

  it("getConnectivityState returns mapped tauri result", async () => {
    mockTauriInvoke.mockResolvedValue({
      is_online: true,
      last_checked_at_unix_ms: 2000,
    });

    const storage = new TauriStorage();
    const state = await storage.getConnectivityState();

    expect(state).toEqual({ isOnline: true, lastChecked: 2000, lastError: undefined });
  });
});
