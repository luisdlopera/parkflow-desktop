import { describe, it, expect, beforeEach } from "vitest";
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

  it.each([[], [], [], [], []])("generates unique keys on demand", () => {
    const keys = new Set([
      newIdempotencyKey(),
      newIdempotencyKey(),
      newIdempotencyKey(),
      newIdempotencyKey(),
      newIdempotencyKey(),
    ]);
    expect(keys.size).toBe(5);
  });

  it("generates UUID format or pf- fallback format", () => {
    const key = newIdempotencyKey();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(key);
    const isFallback = /^pf-\d+-[0-9a-f]+$/.test(key);
    expect(isUUID || isFallback).toBe(true);
  });

  it.each([
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
  ])("generates non-empty string every time", () => {
    const key = newIdempotencyKey();
    expect(key.length).toBeGreaterThan(0);
  });

  it("always returns string type", () => {
    for (let i = 0; i < 10; i++) {
      const key = newIdempotencyKey();
      expect(typeof key).toBe("string");
    }
  });

  it("generates keys without null or undefined", () => {
    const keys = [newIdempotencyKey(), newIdempotencyKey(), newIdempotencyKey()];
    keys.forEach((key) => {
      expect(key).not.toBeNull();
      expect(key).not.toBeUndefined();
    });
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

  it.each([
    ["create_user", "user@example.com"],
    ["create_rate", "rate-123"],
    ["create_payment", "payment-456"],
    ["update_company", "company-789"],
    ["delete_session", "session-000"],
  ])("creates key for operation %p with fingerprint %p", (op, fp) => {
    const key = getOrCreateIdempotencyKey(op, fp);
    expect(key).toBeTruthy();
    expect(typeof key).toBe("string");
  });

  it("handles empty string fingerprint", () => {
    const key1 = getOrCreateIdempotencyKey("operation", "");
    const key2 = getOrCreateIdempotencyKey("operation", "");
    expect(key1).toBe(key2);
  });

  it("handles empty string operation", () => {
    const key1 = getOrCreateIdempotencyKey("", "fingerprint");
    const key2 = getOrCreateIdempotencyKey("", "fingerprint");
    expect(key1).toBe(key2);
  });

  it("handles both empty operation and fingerprint", () => {
    const key1 = getOrCreateIdempotencyKey("", "");
    const key2 = getOrCreateIdempotencyKey("", "");
    expect(key1).toBe(key2);
  });

  it.each([
    ["op1", "fp1"],
    ["op2", "fp2"],
    ["op3", "fp3"],
    ["op4", "fp4"],
  ])("maintains separate keys for different pairs: %p, %p", (op, fp) => {
    const keys = new Map();
    keys.set(`${op}-${fp}`, getOrCreateIdempotencyKey(op, fp));

    const otherOp = "other_op";
    const otherFp = "other_fp";
    const otherKey = getOrCreateIdempotencyKey(otherOp, otherFp);

    expect(otherKey).not.toBe(keys.get(`${op}-${fp}`));
  });

  it("handles very long fingerprints", () => {
    const longFp = "x".repeat(1000);
    const key = getOrCreateIdempotencyKey("op", longFp);
    expect(key).toBeTruthy();
  });

  it("handles special characters in fingerprint", () => {
    const specialFp = "!@#$%^&*(){}[]|\\:;<>?,./";
    const key = getOrCreateIdempotencyKey("op", specialFp);
    expect(key).toBeTruthy();
  });

  it("handles special characters in operation", () => {
    const specialOp = "op-!@#$%^";
    const key = getOrCreateIdempotencyKey(specialOp, "fp");
    expect(key).toBeTruthy();
  });

  it("persists across multiple retrievals", () => {
    const op = "test_op";
    const fp = "test_fp";
    const key1 = getOrCreateIdempotencyKey(op, fp);
    const key2 = getOrCreateIdempotencyKey(op, fp);
    const key3 = getOrCreateIdempotencyKey(op, fp);
    expect(key1).toBe(key2);
    expect(key2).toBe(key3);
  });

  it("handles JSON fingerprints", () => {
    const fp = JSON.stringify({ id: 123, name: "test" });
    const key1 = getOrCreateIdempotencyKey("op", fp);
    const key2 = getOrCreateIdempotencyKey("op", fp);
    expect(key1).toBe(key2);
  });

  it("distinguishes different JSON fingerprints", () => {
    const fp1 = JSON.stringify({ id: 123 });
    const fp2 = JSON.stringify({ id: 124 });
    const key1 = getOrCreateIdempotencyKey("op", fp1);
    const key2 = getOrCreateIdempotencyKey("op", fp2);
    expect(key1).not.toBe(key2);
  });

  it("handles unicode in fingerprint", () => {
    const unicodeFp = "测试用户-тест-テスト";
    const key = getOrCreateIdempotencyKey("op", unicodeFp);
    expect(key).toBeTruthy();
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

  it.each([
    ["op1", "fp1"],
    ["op2", "fp2"],
    ["op3", "fp3"],
  ])("clears specific pair: %p, %p", (op, fp) => {
    const key = getOrCreateIdempotencyKey(op, fp);
    clearIdempotencyKey(op, fp);
    const newKey = getOrCreateIdempotencyKey(op, fp);
    expect(newKey).not.toBe(key);
  });

  it("handles clearing non-existent keys", () => {
    expect(() => {
      clearIdempotencyKey("nonexistent_op", "nonexistent_fp");
    }).not.toThrow();
  });

  it("allows re-creating cleared keys", () => {
    const op = "op";
    const fp = "fp";
    const key1 = getOrCreateIdempotencyKey(op, fp);
    clearIdempotencyKey(op, fp);
    const key2 = getOrCreateIdempotencyKey(op, fp);
    clearIdempotencyKey(op, fp);
    const key3 = getOrCreateIdempotencyKey(op, fp);
    expect(key1).not.toBe(key2);
    expect(key2).not.toBe(key3);
  });

  it("clears empty string operation and fingerprint", () => {
    const key = getOrCreateIdempotencyKey("", "");
    clearIdempotencyKey("", "");
    const newKey = getOrCreateIdempotencyKey("", "");
    expect(newKey).not.toBe(key);
  });

  it("independently manages multiple operations", () => {
    const fp = "shared_fp";
    const op1 = "op1";
    const op2 = "op2";
    const op3 = "op3";

    const key1 = getOrCreateIdempotencyKey(op1, fp);
    const key2 = getOrCreateIdempotencyKey(op2, fp);
    const key3 = getOrCreateIdempotencyKey(op3, fp);

    clearIdempotencyKey(op1, fp);
    clearIdempotencyKey(op3, fp);

    const newKey1 = getOrCreateIdempotencyKey(op1, fp);
    const sameKey2 = getOrCreateIdempotencyKey(op2, fp);
    const newKey3 = getOrCreateIdempotencyKey(op3, fp);

    expect(newKey1).not.toBe(key1);
    expect(sameKey2).toBe(key2);
    expect(newKey3).not.toBe(key3);
  });

  it("handles clearing with special characters", () => {
    const op = "op!@#";
    const fp = "fp$%^";
    const key = getOrCreateIdempotencyKey(op, fp);
    clearIdempotencyKey(op, fp);
    const newKey = getOrCreateIdempotencyKey(op, fp);
    expect(newKey).not.toBe(key);
  });
});

describe("Idempotency workflow", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("manages full lifecycle: create, retrieve, clear, recreate", () => {
    const op = "payment";
    const fp = "id-123";

    // Create
    const key1 = getOrCreateIdempotencyKey(op, fp);
    expect(key1).toBeTruthy();

    // Retrieve (should be same)
    const key1Again = getOrCreateIdempotencyKey(op, fp);
    expect(key1Again).toBe(key1);

    // Clear
    clearIdempotencyKey(op, fp);

    // Recreate (should be different)
    const key2 = getOrCreateIdempotencyKey(op, fp);
    expect(key2).not.toBe(key1);

    // Retrieve new (should be same as new)
    const key2Again = getOrCreateIdempotencyKey(op, fp);
    expect(key2Again).toBe(key2);
  });

  it("handles multiple concurrent operations", () => {
    const operations = [
      { op: "create", fp: "user-1" },
      { op: "create", fp: "user-2" },
      { op: "update", fp: "user-1" },
      { op: "delete", fp: "user-3" },
    ];

    const firstPass = operations.map(({ op, fp }) =>
      getOrCreateIdempotencyKey(op, fp)
    );

    const secondPass = operations.map(({ op, fp }) =>
      getOrCreateIdempotencyKey(op, fp)
    );

    expect(firstPass).toEqual(secondPass);
  });

  it("isolates operations by operation type and fingerprint", () => {
    const baseOps = [
      { op: "exit", fp: "ticket-1" },
      { op: "reprint", fp: "ticket-1" },
    ];

    const exitKey = getOrCreateIdempotencyKey("exit", "ticket-1");
    const reprintKey = getOrCreateIdempotencyKey("reprint", "ticket-1");

    expect(exitKey).not.toBe(reprintKey);

    clearIdempotencyKey("exit", "ticket-1");

    const newExitKey = getOrCreateIdempotencyKey("exit", "ticket-1");
    const sameReprintKey = getOrCreateIdempotencyKey("reprint", "ticket-1");

    expect(newExitKey).not.toBe(exitKey);
    expect(sameReprintKey).toBe(reprintKey);
  });
});
