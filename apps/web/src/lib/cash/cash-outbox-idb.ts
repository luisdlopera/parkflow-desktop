"use client";

import { openDB, type IDBPDatabase } from "idb";

const DB = "parkflow.cash.outbox.v1";
const DB_VERSION = 1;
const STORE = "pending_movements";

export type CashOutboxRow = {
  id: string;
  createdAt: number;
  sessionId: string;
  payloadJson: string;
  attempts: number;
  lastError: string | null;
};

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  dbPromise ??= openDB(DB, DB_VERSION, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) {
        d.createObjectStore(STORE, { keyPath: "id" });
      }
    }
  });
  return dbPromise;
}

export async function enqueueCashMovementOffline(
  sessionId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  const id = `${sessionId}:${crypto.randomUUID()}`;
  const row: CashOutboxRow = {
    id,
    createdAt: Date.now(),
    sessionId,
    payloadJson: JSON.stringify(payload),
    attempts: 0,
    lastError: null
  };
  await db.put(STORE, row);
}

export async function listCashOutboxPending(): Promise<CashOutboxRow[]> {
  const db = await getDb();
  return (await db.getAll(STORE)) as CashOutboxRow[];
}

export async function removeCashOutboxRow(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function markCashOutboxError(id: string, err: string): Promise<void> {
  const db = await getDb();
  const row = (await db.get(STORE, id)) as CashOutboxRow | undefined;
  if (!row) {
    return;
  }
  await db.put(STORE, {
    ...row,
    attempts: row.attempts + 1,
    lastError: err
  });
}
