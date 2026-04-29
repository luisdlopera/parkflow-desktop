/**
 * Tauri Storage Backend - Uses SQLite via Rust invoke commands.
 * This is the preferred storage when running inside Tauri desktop.
 */

import type { StorageBackend, OutboxItem, PrintJob } from "./types";

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

export class TauriStorage implements StorageBackend {
  // Outbox operations - delegates to Rust SQLite
  async outboxEnqueue(item: Omit<OutboxItem, "id" | "createdAt">): Promise<string> {
    const result = await invoke<{ id: number }>("enqueue_outbox_event", {
      request: {
        idempotency_key: item.idempotencyKey,
        event_type: item.eventType,
        payload_json: JSON.stringify(item.payload),
        origin: item.origin,
        user_id: item.userId,
        device_id: item.deviceId,
        auth_session_id: item.authSessionId
      }
    });
    return String(result.id);
  }

  async outboxClaimPending(limit: number): Promise<OutboxItem[]> {
    const rows = await invoke<Array<{
      id: number;
      idempotency_key: string;
      event_type: string;
      payload_json: string;
      origin: string;
      user_id?: string;
      device_id?: string;
      auth_session_id?: string;
      status: string;
      retry_count: number;
      next_retry_at_unix_ms?: number;
      created_at_unix_ms: number;
    }>>("claim_outbox_batch", { limit });

    return rows.map(r => ({
      id: String(r.id),
      idempotencyKey: r.idempotency_key,
      eventType: r.event_type as OutboxItem["eventType"],
      payload: JSON.parse(r.payload_json),
      origin: r.origin,
      userId: r.user_id,
      deviceId: r.device_id,
      authSessionId: r.auth_session_id,
      status: r.status as OutboxItem["status"],
      retryCount: r.retry_count,
      nextRetryAt: r.next_retry_at_unix_ms,
      createdAt: r.created_at_unix_ms
    }));
  }

  async outboxMarkSynced(id: string): Promise<void> {
    await invoke("mark_outbox_synced", { outbox_id: parseInt(id, 10) });
  }

  async outboxMarkFailed(id: string, error: string): Promise<void> {
    await invoke("mark_outbox_failed", { outbox_id: parseInt(id, 10) });
  }

  async outboxGetStats(): Promise<{ pending: number; failed: number; dead: number }> {
    const stats = await this.outboxGetDetailedStats();
    return {
      pending: stats.pending,
      failed: stats.failed,
      dead: stats.deadLetter
    };
  }

  // OBSERVABILITY: Detailed outbox stats including dead letters
  async outboxGetDetailedStats(): Promise<import("./types").OutboxStats> {
    const stats = await invoke<{
      pending: number;
      processing: number;
      failed: number;
      dead_letter: number;
      synced: number;
    }>("get_outbox_stats", {});
    
    return {
      pending: stats.pending,
      processing: stats.processing,
      failed: stats.failed,
      deadLetter: stats.dead_letter,
      synced: stats.synced
    };
  }

  // Print queue operations - delegates to Rust SQLite
  async printEnqueue(job: Omit<PrintJob, "id" | "enqueuedAt">): Promise<string> {
    const result = await invoke<{ id: string }>("queue_print_job", {
      request: {
        session_id: job.sessionId ?? "",
        document_type: job.documentType,
        idempotency_key: job.idempotencyKey,
        payload_hash: ""
      }
    });
    return result.id;
  }

  async printClaimNext(): Promise<PrintJob | null> {
    const jobs = await invoke<Array<{
      id: string;
      document_type: string;
      idempotency_key: string;
      status: string;
      attempts: number;
    }>>("list_print_jobs", {});

    const pending = jobs.find(j => j.status === "pending" || j.status === "failed");
    if (!pending) return null;

    return {
      id: pending.id,
      idempotencyKey: pending.idempotency_key,
      documentType: pending.document_type as PrintJob["documentType"],
      ticket: {},
      attempts: pending.attempts,
      maxAttempts: 12,
      status: pending.status === "failed" ? "pending" : (pending.status as PrintJob["status"]),
      nextRetryAt: Date.now(),
      enqueuedAt: Date.now()
    };
  }

  async printMarkDone(id: string): Promise<void> {
    await invoke("update_print_job_status", {
      request: {
        job_id: id,
        status: "Acked",
        message: null,
        attempt_key: null
      }
    });
  }

  async printMarkRetryOrDead(id: string, error: string): Promise<void> {
    // Check attempts to decide between Failed and DeadLetter
    const jobs = await invoke<Array<{ id: string; attempts: number }>>("list_print_jobs", {});
    const job = jobs.find(j => j.id === id);
    const status = job && job.attempts >= 11 ? "DeadLetter" : "Failed";

    await invoke("update_print_job_status", {
      request: {
        job_id: id,
        status: status,
        message: error,
        attempt_key: null
      }
    });
  }

  async printGetStats(): Promise<{ pending: number; dead: number }> {
    return { pending: 0, dead: 0 };
  }

  // Connectivity operations
  async updateConnectivityState(isOnline: boolean, error?: string): Promise<void> {
    // Managed by Rust worker automatically
  }

  async getConnectivityState(): Promise<{ isOnline: boolean; lastChecked?: number; lastError?: string }> {
    const state = await invoke<{
      is_online: boolean;
      last_checked_at_unix_ms?: number;
      last_error?: string;
    }>("get_connectivity_state", {});

    return {
      isOnline: state.is_online,
      lastChecked: state.last_checked_at_unix_ms,
      lastError: state.last_error
    };
  }
}
