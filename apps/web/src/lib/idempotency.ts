/**
 * Per-operation idempotency key (send on each distinct user action, not per session lifetime).
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const IDEMPOTENCY_PREFIX = "pf:idempotency:";

function hashFingerprint(raw: string): string {
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function storageKey(operation: string, fingerprint: string): string {
  return `${IDEMPOTENCY_PREFIX}${operation}:${hashFingerprint(fingerprint)}`;
}

export function getOrCreateIdempotencyKey(operation: string, fingerprint: string): string {
  if (typeof window === "undefined" || !window.localStorage) {
    return newIdempotencyKey();
  }
  const key = storageKey(operation, fingerprint);
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const next = newIdempotencyKey();
  window.localStorage.setItem(key, next);
  return next;
}

export function clearIdempotencyKey(operation: string, fingerprint: string): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  window.localStorage.removeItem(storageKey(operation, fingerprint));
}
