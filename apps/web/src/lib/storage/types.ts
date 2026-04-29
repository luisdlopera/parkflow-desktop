/**
 * Storage abstraction types for unified offline storage.
 * Provides a single interface that works with:
 * - SQLite (via Tauri) when running in desktop mode
 * - IndexedDB when running in browser-only mode
 */

export type OutboxEventType =
  | "ENTRY_RECORDED"
  | "EXIT_RECORDED"
  | "TICKET_REPRINTED"
  | "LOST_TICKET"
  | "CASH_MOVEMENT";

export interface OutboxItem {
  id: string;
  idempotencyKey: string;
  eventType: OutboxEventType;
  payload: unknown;
  origin: string;
  userId?: string;
  deviceId?: string;
  authSessionId?: string;
  status: "pending" | "processing" | "failed" | "dead_letter" | "synced";
  retryCount: number;
  nextRetryAt?: number;
  createdAt: number;
  updatedAt?: number;
  lastError?: string;
}

export interface PrintJob {
  id: string;
  idempotencyKey: string;
  documentType: "ENTRY" | "EXIT" | "REPRINT" | "LOST_TICKET" | "CASH_CLOSING" | "CASH_MOVEMENT" | "CASH_COUNT";
  ticket: unknown;
  attempts: number;
  maxAttempts: number;
  status: "pending" | "dead" | "processing";
  nextRetryAt: number;
  enqueuedAt: number;
  lastError?: string;
  sessionId?: string;
  operatorUserId?: string;
}

export interface OutboxStats {
  pending: number;
  processing: number;
  failed: number;
  deadLetter: number;
  synced: number;
}

export interface StorageBackend {
  // Outbox operations
  outboxEnqueue(item: Omit<OutboxItem, "id" | "createdAt">): Promise<string>;
  outboxClaimPending(limit: number): Promise<OutboxItem[]>;
  outboxMarkSynced(id: string): Promise<void>;
  outboxMarkFailed(id: string, error: string): Promise<void>;
  outboxGetStats(): Promise<{ pending: number; failed: number; dead: number }>;
  // OBSERVABILITY: Detailed stats including dead letters
  outboxGetDetailedStats?(): Promise<OutboxStats>;

  // Print queue operations
  printEnqueue(job: Omit<PrintJob, "id" | "enqueuedAt">): Promise<string>;
  printClaimNext(): Promise<PrintJob | null>;
  printMarkDone(id: string): Promise<void>;
  printMarkRetryOrDead(id: string, error: string): Promise<void>;
  printGetStats(): Promise<{ pending: number; dead: number }>;

  // Connectivity state
  updateConnectivityState(isOnline: boolean, error?: string): Promise<void>;
  getConnectivityState(): Promise<{ isOnline: boolean; lastChecked?: number; lastError?: string }>;
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
