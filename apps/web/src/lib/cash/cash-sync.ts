"use client";

import { cashAddMovement } from "@/lib/cash/cash-api";
import { listCashOutboxPending, markCashOutboxError, removeCashOutboxRow } from "@/lib/cash/cash-outbox-idb";

/**
 * Reintenta movimientos encolados offline (deduplicacion por idempotency en servidor).
 */
export async function flushCashMovementOutbox(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }
  const rows = await listCashOutboxPending();
  let synced = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const body = JSON.parse(row.payloadJson) as {
        type: string;
        paymentMethod: string;
        amount: number;
        reason?: string | null;
        idempotencyKey?: string | null;
      };
      await cashAddMovement(row.sessionId, {
        type: body.type,
        paymentMethod: body.paymentMethod,
        amount: body.amount,
        reason: body.reason ?? null,
        idempotencyKey: body.idempotencyKey ?? `outbox:${row.id}`
      });
      await removeCashOutboxRow(row.id);
      synced++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await markCashOutboxError(row.id, msg);
      failed++;
    }
  }
  return { synced, failed };
}
