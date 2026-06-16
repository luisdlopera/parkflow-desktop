import { newIdempotencyKey, getOrCreateIdempotencyKey, clearIdempotencyKey } from "@/lib/idempotency";

describe("newIdempotencyKey", () => {
  it("returns a non-empty string", () => {
    const key = newIdempotencyKey();
    expect(key).toBeTruthy();
    expect(typeof key).toBe("string");
  });

  it("generates unique keys", () => {
    const key1 = newIdempotencyKey();
    const key2 = newIdempotencyKey();
    expect(key1).not.toBe(key2);
  });
});

describe("getOrCreateIdempotencyKey", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates a new key for unknown fingerprint", () => {
    const key = getOrCreateIdempotencyKey("exit", JSON.stringify({ ticket: "T-1", method: "CASH" }));
    expect(key).toBeTruthy();
  });

  it("returns existing key for same fingerprint", () => {
    const fingerprint = JSON.stringify({ ticket: "T-1", method: "CASH" });
    const first = getOrCreateIdempotencyKey("exit", fingerprint);
    const second = getOrCreateIdempotencyKey("exit", fingerprint);
    expect(first).toBe(second);
  });

  it("returns different keys for different operations", () => {
    const fingerprint = JSON.stringify({ ticket: "T-1" });
    const exitKey = getOrCreateIdempotencyKey("exit", fingerprint);
    const reprintKey = getOrCreateIdempotencyKey("reprint", fingerprint);
    expect(exitKey).not.toBe(reprintKey);
  });

  it("returns different keys for different fingerprints", () => {
    const key1 = getOrCreateIdempotencyKey("exit", "fingerprint-1");
    const key2 = getOrCreateIdempotencyKey("exit", "fingerprint-2");
    expect(key1).not.toBe(key2);
  });
});

describe("clearIdempotencyKey", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("clears stored key for given operation and fingerprint", () => {
    const fingerprint = JSON.stringify({ ticket: "T-1", method: "CASH" });
    const first = getOrCreateIdempotencyKey("exit", fingerprint);
    clearIdempotencyKey("exit", fingerprint);
    const second = getOrCreateIdempotencyKey("exit", fingerprint);
    expect(first).not.toBe(second);
  });

  it("does not affect other operations keys", () => {
    const fp = JSON.stringify({ ticket: "T-1" });
    const exitKey = getOrCreateIdempotencyKey("exit", fp);
    const reprintKey = getOrCreateIdempotencyKey("reprint", fp);
    clearIdempotencyKey("exit", fp);
    const reprintKey2 = getOrCreateIdempotencyKey("reprint", fp);
    expect(reprintKey).toBe(reprintKey2);
  });
});
