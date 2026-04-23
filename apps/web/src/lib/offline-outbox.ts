"use client";

import { newIdempotencyKey } from "@/lib/idempotency";
import { isOfflineLeaseValid, loadSession } from "@/lib/auth";

type OfflineEventType =
  | "ENTRY_RECORDED"
  | "EXIT_RECORDED"
  | "TICKET_REPRINTED"
  | "LOST_TICKET";

export async function queueOfflineOperation(eventType: OfflineEventType, payload: unknown): Promise<boolean> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return false;
  }

  const leaseValid = await isOfflineLeaseValid();
  if (!leaseValid) {
    return false;
  }

  const session = await loadSession();
  if (!session) {
    return false;
  }

  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("enqueue_outbox_event", {
    request: {
      idempotency_key: newIdempotencyKey(),
      event_type: eventType,
      payload_json: JSON.stringify(payload),
      origin: "OFFLINE_PENDING_SYNC",
      user_id: session.user.id,
      device_id: session.session.deviceId,
      auth_session_id: session.session.sessionId
    }
  });
  return true;
}
