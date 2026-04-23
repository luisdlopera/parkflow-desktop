/**
 * Per-operation idempotency key (send on each distinct user action, not per session lifetime).
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
