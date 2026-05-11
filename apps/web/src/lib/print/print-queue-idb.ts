"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { PrintDocumentType, TicketDocument } from "@parkflow/types";
import { printJobIdempotencyKey } from "@parkflow/types";

const DB = "parkflow.print.queue.v1";
const DB_VERSION = 2;
const STORE = "jobs";

type Row = {
  id: string;
  idempotencyKey: string;
  documentType: PrintDocumentType;
  ticket: TicketDocument;
  attempts: number;
  nextRetryAt: number;
  status: "pending" | "dead";
  enqueuedAt: number;
  lastError: string | null;
  /** Para sincronizar PrintJob en el API al reimprimir desde cola. */
  sessionId?: string | null;
  operatorUserId?: string | null;
};

const MAX_ATTEMPTS = 12;
const baseDelayMs = 1_000;

function backoffMs(attempt: number): number {
  return baseDelayMs * 2 ** Math.min(attempt, 8);
}

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

export function buildPrintQueueIdempotencyKey(
  ticketId: string,
  documentType: PrintDocumentType
): string {
  return printJobIdempotencyKey(ticketId, documentType, "thermal-v1");
}

export async function enqueueLocalPrint(
  idempotencyKey: string,
  documentType: PrintDocumentType,
  ticket: TicketDocument,
  syncMeta?: { sessionId: string | null; operatorUserId: string | null }
): Promise<void> {
  const db = await getDb();
  const id = idempotencyKey;
  const now = Date.now();
  const row: Row = {
    id,
    idempotencyKey,
    documentType,
    ticket,
    attempts: 0,
    nextRetryAt: now,
    status: "pending",
    enqueuedAt: now,
    lastError: null,
    sessionId: syncMeta?.sessionId ?? null,
    operatorUserId: syncMeta?.operatorUserId ?? null
  };
  const existing = (await db.get(STORE, id)) as Row | undefined;
  if (existing) {
    if ((syncMeta?.sessionId || syncMeta?.operatorUserId) && (!existing.sessionId || !existing.operatorUserId)) {
      await db.put(STORE, {
        ...existing,
        sessionId: existing.sessionId ?? syncMeta?.sessionId ?? null,
        operatorUserId: existing.operatorUserId ?? syncMeta?.operatorUserId ?? null
      });
    }
    return;
  }
  await db.put(STORE, row);
}

export async function pickNextJob(): Promise<Row | null> {
  const db = await getDb();
  const all = (await db.getAll(STORE)) as Row[];
  const now = Date.now();
  const ready = all
    .filter((j) => j.status === "pending" && j.nextRetryAt <= now)
    .sort((a, b) => a.enqueuedAt - b.enqueuedAt);
  return ready[0] ?? null;
}

export async function getJobById(id: string): Promise<Row | null> {
  const db = await getDb();
  return ((await db.get(STORE, id)) as Row | undefined) ?? null;
}

export async function markJobDone(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function markJobRetryOrDead(row: Row, err: string): Promise<void> {
  const db = await getDb();
  const nextAttempts = row.attempts + 1;
  if (nextAttempts >= MAX_ATTEMPTS) {
    await db.put(STORE, {
      ...row,
      attempts: nextAttempts,
      lastError: err,
      status: "dead"
    });
    return;
  }
  const next = Date.now() + backoffMs(nextAttempts);
  await db.put(STORE, {
    ...row,
    attempts: nextAttempts,
    lastError: err,
    nextRetryAt: next,
    status: "pending"
  });
}

export async function listQueueStats(): Promise<{
  pending: number;
  dead: number;
}> {
  const db = await getDb();
  const all = (await db.getAll(STORE)) as Row[];
  return {
    pending: all.filter((j) => j.status === "pending").length,
    dead: all.filter((j) => j.status === "dead").length
  };
}

export type { Row as LocalPrintQueueRow };
