import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("crypto", {
  randomUUID: () => "00000000-0000-4000-8000-000000000000",
});

async function clearStore() {
  const { openDB } = await import("idb");
  const db = await openDB("parkflow.cash.outbox.v1", 1, {
    upgrade(d) {
      if (!d.objectStoreNames.contains("pending_movements")) {
        d.createObjectStore("pending_movements", { keyPath: "id" });
      }
    },
  });
  await db.clear("pending_movements");
  db.close();
}

describe("cash outbox idb", () => {
  beforeEach(async () => {
    await clearStore();
  });

  afterEach(async () => {
    await clearStore();
  });

  it("enqueues a movement offline", async () => {
    const { enqueueCashMovementOffline } = await import("../cash-outbox-idb");

    await enqueueCashMovementOffline("session-1", { type: "CASH_IN", amount: 50000 });

    const { listCashOutboxPending } = await import("../cash-outbox-idb");
    const rows = await listCashOutboxPending();

    expect(rows).toHaveLength(1);
    expect(rows[0].sessionId).toBe("session-1");
    expect(rows[0].attempts).toBe(0);
    expect(rows[0].lastError).toBeNull();
    expect(JSON.parse(rows[0].payloadJson)).toEqual({ type: "CASH_IN", amount: 50000 });
  });

  it("creates unique ids with session prefix and uuid", async () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "11111111-1111-4111-8111-111111111111",
    });

    const { enqueueCashMovementOffline } = await import("../cash-outbox-idb");
    await enqueueCashMovementOffline("session-1", { amount: 100 });

    vi.stubGlobal("crypto", {
      randomUUID: () => "22222222-2222-4222-8222-222222222222",
    });

    await enqueueCashMovementOffline("session-1", { amount: 200 });

    const { listCashOutboxPending } = await import("../cash-outbox-idb");
    const rows = await listCashOutboxPending();

    expect(rows).toHaveLength(2);
    expect(rows[0].id).not.toBe(rows[1].id);
    expect(rows[0].id).toContain("session-1:");
    expect(rows[1].id).toContain("session-1:");
  });

  it("lists pending movements", async () => {
    const { enqueueCashMovementOffline } = await import("../cash-outbox-idb");

    await enqueueCashMovementOffline("session-1", { type: "CASH_IN" });
    await enqueueCashMovementOffline("session-2", { type: "CASH_OUT" });

    const { listCashOutboxPending } = await import("../cash-outbox-idb");
    const rows = await listCashOutboxPending();

    expect(rows).toHaveLength(2);
  });

  it("removes a row by id", async () => {
    const { enqueueCashMovementOffline } = await import("../cash-outbox-idb");
    const { listCashOutboxPending, removeCashOutboxRow } = await import("../cash-outbox-idb");

    await enqueueCashMovementOffline("s1", { type: "CASH_IN" });
    const rows = await listCashOutboxPending();
    expect(rows).toHaveLength(1);

    await removeCashOutboxRow(rows[0].id);
    const remaining = await listCashOutboxPending();
    expect(remaining).toHaveLength(0);
  });

  it("marks a row with error and increments attempts", async () => {
    const { enqueueCashMovementOffline, markCashOutboxError } = await import("../cash-outbox-idb");
    const { listCashOutboxPending } = await import("../cash-outbox-idb");

    await enqueueCashMovementOffline("s1", { type: "CASH_IN" });
    const rows = await listCashOutboxPending();
    const rowId = rows[0].id;

    await markCashOutboxError(rowId, "Network error");
    await markCashOutboxError(rowId, "Retry failed");

    const updated = await listCashOutboxPending();
    expect(updated).toHaveLength(1);
    expect(updated[0].attempts).toBe(2);
    expect(updated[0].lastError).toBe("Retry failed");
  });

  it("markCashOutboxError does nothing for non-existent row", async () => {
    const { markCashOutboxError } = await import("../cash-outbox-idb");

    await expect(markCashOutboxError("non-existent", "err")).resolves.toBeUndefined();
  });
});
