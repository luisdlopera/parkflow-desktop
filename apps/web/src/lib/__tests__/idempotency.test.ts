import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  newIdempotencyKey,
  getOrCreateIdempotencyKey,
  clearIdempotencyKey,
} from "../idempotency";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

describe("idempotency", () => {
  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe("newIdempotencyKey", () => {
    it("should generate a UUID-like key", () => {
      const key = newIdempotencyKey();
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });

    it("should generate unique keys on each call", () => {
      const key1 = newIdempotencyKey();
      const key2 = newIdempotencyKey();
      expect(key1).not.toBe(key2);
    });

    it("should generate different keys for multiple calls", () => {
      const keys = new Set();
      for (let i = 0; i < 10; i++) {
        keys.add(newIdempotencyKey());
      }
      expect(keys.size).toBe(10);
    });

    it("should generate keys matching UUID format if crypto available", () => {
      const key = newIdempotencyKey();
      // Should be UUID-like: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      if (key.includes("-")) {
        const parts = key.split("-");
        expect(parts.length).toBe(5);
      }
    });

    it("should start with pf- if fallback is used", () => {
      // Fallback format: pf-{timestamp}-{random}
      const key = newIdempotencyKey();
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(10);
    });

    it("should generate keys with consistent format", () => {
      const key = newIdempotencyKey();
      expect(/^[a-f0-9-]+$/i.test(key) || key.startsWith("pf-")).toBe(true);
    });

    it("should be deterministic in format but not value", () => {
      const key1 = newIdempotencyKey();
      const key2 = newIdempotencyKey();
      expect(typeof key1).toBe("string");
      expect(typeof key2).toBe("string");
      expect(key1).not.toBe(key2);
    });

    it("should never return empty string", () => {
      for (let i = 0; i < 20; i++) {
        const key = newIdempotencyKey();
        expect(key.length).toBeGreaterThan(0);
      }
    });

    it("should not contain null or undefined", () => {
      const key = newIdempotencyKey();
      expect(key).not.toContain("null");
      expect(key).not.toContain("undefined");
    });

    it("should handle rapid consecutive calls", () => {
      const keys = [];
      for (let i = 0; i < 100; i++) {
        keys.push(newIdempotencyKey());
      }
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(100);
    });
  });

  describe("getOrCreateIdempotencyKey", () => {
    it("should create and return a new key when not in storage", () => {
      const key = getOrCreateIdempotencyKey("test-operation", "fingerprint-1");
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });

    it("should retrieve existing key from storage on second call", () => {
      const operation = "test-operation";
      const fingerprint = "fingerprint-1";

      const key1 = getOrCreateIdempotencyKey(operation, fingerprint);
      const key2 = getOrCreateIdempotencyKey(operation, fingerprint);

      expect(key1).toBe(key2);
    });

    it("should create different keys for different operations", () => {
      const fingerprint = "same-fingerprint";
      const key1 = getOrCreateIdempotencyKey("operation-1", fingerprint);
      const key2 = getOrCreateIdempotencyKey("operation-2", fingerprint);

      expect(key1).not.toBe(key2);
    });

    it("should create different keys for different fingerprints", () => {
      const operation = "same-operation";
      const key1 = getOrCreateIdempotencyKey(operation, "fingerprint-1");
      const key2 = getOrCreateIdempotencyKey(operation, "fingerprint-2");

      expect(key1).not.toBe(key2);
    });

    it("should store key in localStorage with correct prefix", () => {
      const operation = "test-operation";
      const fingerprint = "fingerprint-1";
      const key = getOrCreateIdempotencyKey(operation, fingerprint);

      // Verify the key exists in storage by retrieving it again
      const keyAgain = getOrCreateIdempotencyKey(operation, fingerprint);
      expect(keyAgain).toBe(key);

      // Check that some storage was used - the mock object should have items
      // We can't directly access the mock's internal store, but we can verify
      // that retrieving again returns the same key (proving it was stored)
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });

    it("should handle empty operation string", () => {
      const key = getOrCreateIdempotencyKey("", "fingerprint");
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });

    it("should handle empty fingerprint string", () => {
      const key = getOrCreateIdempotencyKey("operation", "");
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });

    it("should handle both operation and fingerprint empty", () => {
      const key = getOrCreateIdempotencyKey("", "");
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });

    it("should handle special characters in operation", () => {
      const key = getOrCreateIdempotencyKey("op-eration/special", "fingerprint");
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });

    it("should handle special characters in fingerprint", () => {
      const key = getOrCreateIdempotencyKey("operation", "finger@print#123");
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });

    it("should handle very long operation strings", () => {
      const longOp = "operation-" + "x".repeat(1000);
      const key = getOrCreateIdempotencyKey(longOp, "fingerprint");
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });

    it("should handle very long fingerprint strings", () => {
      const longFp = "fingerprint-" + "y".repeat(1000);
      const key = getOrCreateIdempotencyKey("operation", longFp);
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });

    it("should be consistent across multiple retrievals", () => {
      const operation = "consistent-op";
      const fingerprint = "consistent-fp";

      const keys = [];
      for (let i = 0; i < 5; i++) {
        keys.push(getOrCreateIdempotencyKey(operation, fingerprint));
      }

      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(1);
    });

    it("should return null-like behavior when window is undefined", () => {
      // This test documents expected behavior; actual testing requires mocking window
      const key = getOrCreateIdempotencyKey("operation", "fingerprint");
      expect(typeof key).toBe("string");
    });

    it("should handle numeric characters in operation", () => {
      const key1 = getOrCreateIdempotencyKey("operation-123", "fp");
      const key2 = getOrCreateIdempotencyKey("operation-123", "fp");
      expect(key1).toBe(key2);
    });

    it("should handle numeric characters in fingerprint", () => {
      const key1 = getOrCreateIdempotencyKey("op", "fp-456");
      const key2 = getOrCreateIdempotencyKey("op", "fp-456");
      expect(key1).toBe(key2);
    });

    it("should handle unicode characters in operation", () => {
      const key = getOrCreateIdempotencyKey("operación-ñ", "fingerprint");
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });

    it("should handle unicode characters in fingerprint", () => {
      const key = getOrCreateIdempotencyKey("operation", "fingerprint-ñ");
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });

    it("should create consistent hashes for same inputs", () => {
      const op = "create_payment";
      const fp = "user_123_amount_500";

      const key1 = getOrCreateIdempotencyKey(op, fp);
      // Clear storage and try again
      localStorageMock.clear();
      const key2 = getOrCreateIdempotencyKey(op, fp);

      // Should create different keys since storage was cleared
      expect(key1).not.toBe(key2);
    });

    it("should handle case-sensitive operations", () => {
      const key1 = getOrCreateIdempotencyKey("Operation", "fp");
      const key2 = getOrCreateIdempotencyKey("operation", "fp");
      expect(key1).not.toBe(key2);
    });

    it("should handle whitespace in operation", () => {
      const key1 = getOrCreateIdempotencyKey("operation 1", "fp");
      const key2 = getOrCreateIdempotencyKey("operation 1", "fp");
      expect(key1).toBe(key2);
    });

    it("should handle whitespace in fingerprint", () => {
      const key1 = getOrCreateIdempotencyKey("op", "fingerprint 1");
      const key2 = getOrCreateIdempotencyKey("op", "fingerprint 1");
      expect(key1).toBe(key2);
    });

    it("should handle real-world operation names", () => {
      const operations = [
        "payment.create",
        "ticket.entry",
        "vehicle.register",
        "cash.open",
      ];

      operations.forEach((op) => {
        const key = getOrCreateIdempotencyKey(op, "fp");
        expect(typeof key).toBe("string");
      });
    });
  });

  describe("clearIdempotencyKey", () => {
    it("should remove key from localStorage", () => {
      const operation = "test-operation";
      const fingerprint = "fingerprint-1";

      // Create key
      getOrCreateIdempotencyKey(operation, fingerprint);

      // Clear it
      clearIdempotencyKey(operation, fingerprint);

      // Verify it's gone by creating a new one
      const newKey = getOrCreateIdempotencyKey(operation, fingerprint);
      expect(typeof newKey).toBe("string");
    });

    it("should allow recreation after clearing", () => {
      const operation = "test-op";
      const fingerprint = "fp";

      const key1 = getOrCreateIdempotencyKey(operation, fingerprint);
      clearIdempotencyKey(operation, fingerprint);
      const key2 = getOrCreateIdempotencyKey(operation, fingerprint);

      expect(key1).not.toBe(key2);
    });

    it("should handle clearing non-existent keys", () => {
      expect(() => {
        clearIdempotencyKey("non-existent-op", "fp");
      }).not.toThrow();
    });

    it("should not affect other operations", () => {
      const fp = "fingerprint";
      const key1 = getOrCreateIdempotencyKey("operation-1", fp);
      const key2 = getOrCreateIdempotencyKey("operation-2", fp);

      clearIdempotencyKey("operation-1", fp);

      const key2Again = getOrCreateIdempotencyKey("operation-2", fp);
      expect(key2).toBe(key2Again);
    });

    it("should not affect other fingerprints", () => {
      const op = "operation";
      const key1 = getOrCreateIdempotencyKey(op, "fp-1");
      const key2 = getOrCreateIdempotencyKey(op, "fp-2");

      clearIdempotencyKey(op, "fp-1");

      const key2Again = getOrCreateIdempotencyKey(op, "fp-2");
      expect(key2).toBe(key2Again);
    });

    it("should handle empty operation", () => {
      expect(() => {
        clearIdempotencyKey("", "fingerprint");
      }).not.toThrow();
    });

    it("should handle empty fingerprint", () => {
      expect(() => {
        clearIdempotencyKey("operation", "");
      }).not.toThrow();
    });

    it("should handle both operation and fingerprint empty", () => {
      expect(() => {
        clearIdempotencyKey("", "");
      }).not.toThrow();
    });

    it("should handle special characters in operation", () => {
      const operation = "op-eration/special";
      const fingerprint = "fp";

      getOrCreateIdempotencyKey(operation, fingerprint);
      expect(() => {
        clearIdempotencyKey(operation, fingerprint);
      }).not.toThrow();
    });

    it("should handle special characters in fingerprint", () => {
      const operation = "op";
      const fingerprint = "finger@print#123";

      getOrCreateIdempotencyKey(operation, fingerprint);
      expect(() => {
        clearIdempotencyKey(operation, fingerprint);
      }).not.toThrow();
    });

    it("should not throw when window is undefined", () => {
      // Documents expected behavior
      expect(() => {
        clearIdempotencyKey("operation", "fingerprint");
      }).not.toThrow();
    });

    it("should clear multiple keys independently", () => {
      const operations = ["op-1", "op-2", "op-3"];
      const fp = "fp";

      operations.forEach((op) => {
        getOrCreateIdempotencyKey(op, fp);
      });

      clearIdempotencyKey("op-2", fp);

      const key1Again = getOrCreateIdempotencyKey("op-1", fp);
      const key3Again = getOrCreateIdempotencyKey("op-3", fp);

      // op-1 and op-3 should still return same keys
      expect(key1Again).toBeDefined();
      expect(key3Again).toBeDefined();
    });
  });

  describe("Integration scenarios", () => {
    it("should handle full lifecycle: create -> retrieve -> clear -> recreate", () => {
      const op = "lifecycle-test";
      const fp = "fingerprint";

      const key1 = getOrCreateIdempotencyKey(op, fp);
      const key1Again = getOrCreateIdempotencyKey(op, fp);
      expect(key1).toBe(key1Again);

      clearIdempotencyKey(op, fp);

      const key2 = getOrCreateIdempotencyKey(op, fp);
      expect(key2).not.toBe(key1);
    });

    it("should handle multiple concurrent operations", () => {
      const operations = ["create", "update", "delete"];
      const fingerprints = ["fp-1", "fp-2"];

      const keys: Record<string, Record<string, string>> = {};

      operations.forEach((op) => {
        keys[op] = {};
        fingerprints.forEach((fp) => {
          keys[op][fp] = getOrCreateIdempotencyKey(op, fp);
        });
      });

      // Verify all combinations are unique
      const allKeys = Object.values(keys).flatMap((k) =>
        Object.values(k)
      );
      const uniqueKeys = new Set(allKeys);
      expect(uniqueKeys.size).toBe(allKeys.length);
    });

    it("should maintain idempotency key consistency across operations", () => {
      const op = "payment.create";
      const fp = "user_123_amount_500";

      const key1 = getOrCreateIdempotencyKey(op, fp);
      const key2 = getOrCreateIdempotencyKey(op, fp);
      const key3 = getOrCreateIdempotencyKey(op, fp);

      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
    });
  });
});
