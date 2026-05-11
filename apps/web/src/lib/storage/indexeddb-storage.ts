/**
 * IndexedDB Storage Backend - Fallback for browser-only mode.
 * Wraps existing IndexedDB implementations to provide unified interface.
 */

import type { StorageBackend, OutboxItem, PrintJob } from "./types";
import {
  enqueueCashMovementOffline,
  listCashOutboxPending,
  markCashOutboxError,
  removeCashOutboxRow
} from "../cash/cash-outbox-idb";
import {
  enqueueLocalPrint,
  getJobById,
  pickNextJob,
  markJobDone,
  markJobRetryOrDead,
  listQueueStats
} from "../print/print-queue-idb";

/**
 * Converts legacy cash outbox format to unified OutboxItem format.
 */
function toOutboxItem(row: {
  id: string;
  sessionId: string;
  payloadJson: string;
  attempts: number;
  lastError: string | null;
}): OutboxItem {
  const payload = JSON.parse(row.payloadJson);
  return {
    id: row.id,
    idempotencyKey: payload.idempotencyKey ?? row.id,
    eventType: payload.type === "CASH_MOVEMENT" ? "CASH_MOVEMENT" : "ENTRY_RECORDED",
    payload,
    origin: "OFFLINE_PENDING_SYNC",
    status: row.attempts > 10 ? "failed" : "pending",
    retryCount: row.attempts,
    createdAt: Date.now(), // Legacy doesn't track creation time
    lastError: row.lastError ?? undefined
  };
}

/**
 * Converts legacy print queue format to unified PrintJob format.
 */
function toPrintJob(row: {
  id: string;
  idempotencyKey: string;
  documentType: PrintJob["documentType"];
  ticket: unknown;
  attempts: number;
  status: "pending" | "dead";
  nextRetryAt: number;
  enqueuedAt: number;
  lastError?: string | null;
  sessionId?: string | null;
  operatorUserId?: string | null;
}): PrintJob {
  return {
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    documentType: row.documentType,
    ticket: row.ticket,
    attempts: row.attempts,
    maxAttempts: 12,
    status: row.status,
    nextRetryAt: row.nextRetryAt,
    enqueuedAt: row.enqueuedAt,
    lastError: row.lastError ?? undefined,
    sessionId: row.sessionId ?? undefined,
    operatorUserId: row.operatorUserId ?? undefined
  };
}

export class IndexedDBStorage implements StorageBackend {
  // Outbox operations - delegates to existing cash-outbox-idb
  async outboxEnqueue(item: Omit<OutboxItem, "id" | "createdAt">): Promise<string> {
    // For cash movements, use existing cash outbox
    if (item.eventType === "CASH_MOVEMENT") {
      const sessionId = (item.payload as { sessionId?: string })?.sessionId ?? "unknown";
      await enqueueCashMovementOffline(sessionId, item.payload as Record<string, unknown>);
      return `cash:${sessionId}:${Date.now()}`;
    }

    // For other operations, we would need a generic outbox store
    // Currently only cash movements are supported in IndexedDB
    throw new Error(`IndexedDB outbox not implemented for event type: ${item.eventType}`);
  }

  async outboxClaimPending(limit: number): Promise<OutboxItem[]> {
    // Only cash movements supported in IndexedDB
    const rows = await listCashOutboxPending();
    return rows.slice(0, limit).map(toOutboxItem);
  }

  async outboxMarkSynced(id: string): Promise<void> {
    if (id.startsWith("cash:")) {
      const realId = id.replace("cash:", "").split(":")[0];
      await removeCashOutboxRow(realId);
    }
  }

  async outboxMarkFailed(id: string, error: string): Promise<void> {
    if (id.startsWith("cash:")) {
      const realId = id.replace("cash:", "").split(":")[0];
      await markCashOutboxError(realId, error);
    }
  }

  async outboxGetStats(): Promise<{ pending: number; failed: number; dead: number }> {
    const rows = await listCashOutboxPending();
    return {
      pending: rows.filter(r => r.attempts < 10).length,
      failed: rows.filter(r => r.attempts >= 10 && !r.lastError).length,
      dead: rows.filter(r => r.lastError).length
    };
  }

  // Print queue operations - delegates to existing print-queue-idb
  async printEnqueue(job: Omit<PrintJob, "id" | "enqueuedAt">): Promise<string> {
    await enqueueLocalPrint(
      job.idempotencyKey,
      job.documentType,
      job.ticket as import("@parkflow/types").TicketDocument,
      job.sessionId && job.operatorUserId
        ? { sessionId: job.sessionId, operatorUserId: job.operatorUserId }
        : undefined
    );
    return job.idempotencyKey;
  }

  async printClaimNext(): Promise<PrintJob | null> {
    const row = await pickNextJob();
    if (!row) return null;
    return toPrintJob(row);
  }

  async printMarkDone(id: string): Promise<void> {
    await markJobDone(id);
  }

  async printMarkRetryOrDead(id: string, error: string): Promise<void> {
    const row = await getJobById(id);
    if (row) {
      await markJobRetryOrDead(row, error);
    }
  }

  async printGetStats(): Promise<{ pending: number; dead: number }> {
    const stats = await listQueueStats();
    return {
      pending: stats.pending,
      dead: stats.dead
    };
  }

  // Connectivity state - managed via navigator.onLine
  private connectivityState = {
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    lastChecked: Date.now(),
    lastError: undefined as string | undefined
  };

  async updateConnectivityState(isOnline: boolean, error?: string): Promise<void> {
    this.connectivityState = {
      isOnline,
      lastChecked: Date.now(),
      lastError: error
    };
  }

  async getConnectivityState(): Promise<{ isOnline: boolean; lastChecked?: number; lastError?: string }> {
    // Update from navigator if available
    if (typeof navigator !== "undefined") {
      this.connectivityState.isOnline = navigator.onLine;
    }
    return this.connectivityState;
  }
}
