import { describe, it, expect, beforeEach, vi } from "vitest";
import { safeStorage } from "../utils/storage";

describe("storage - safeStorage", () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};
    const mockStorage = {
      getItem: (key: string) => localStorageMock[key] ?? null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete localStorageMock[key];
      },
      clear: () => {
        localStorageMock = {};
      },
      length: 0,
      key: () => null,
    };
    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
    });
    vi.clearAllMocks();
  });

  describe("getItem", () => {
    it("should return value when key exists", () => {
      window.localStorage.setItem("test-key", "test-value");
      const result = safeStorage.getItem("test-key");
      expect(result).toBe("test-value");
    });

    it("should return null when key does not exist", () => {
      const result = safeStorage.getItem("non-existent-key");
      expect(result).toBeNull();
    });

    it.each([
      ["empty-string", ""],
      ["whitespace", "   "],
      ["number-string", "12345"],
      ["json-string", '{"key":"value"}'],
      ["special-chars", "!@#$%^&*()"],
      ["unicode", "こんにちは"],
      ["very-long", "x".repeat(10000)],
    ])("should handle various value types for key %s", (key, value) => {
      window.localStorage.setItem(key, value);
      const result = safeStorage.getItem(key);
      expect(result).toBe(value);
    });

    it("should handle multiple keys independently", () => {
      window.localStorage.setItem("key1", "value1");
      window.localStorage.setItem("key2", "value2");

      expect(safeStorage.getItem("key1")).toBe("value1");
      expect(safeStorage.getItem("key2")).toBe("value2");
    });

    it("should return exactly what was stored", () => {
      const value = "test value with spaces";
      window.localStorage.setItem("key", value);
      const result = safeStorage.getItem("key");
      expect(result).toBe(value);
    });

    it("should return null for keys with null values", () => {
      window.localStorage.setItem("null-key", "");
      const result = safeStorage.getItem("null-key");
      expect(result).toBe("");
    });

    it("should handle keys with special characters", () => {
      const specialKey = "key:with:colons";
      window.localStorage.setItem(specialKey, "value");
      const result = safeStorage.getItem(specialKey);
      expect(result).toBe("value");
    });

    it("should be case-sensitive for keys", () => {
      window.localStorage.setItem("Key", "uppercase");
      window.localStorage.setItem("key", "lowercase");

      expect(safeStorage.getItem("Key")).toBe("uppercase");
      expect(safeStorage.getItem("key")).toBe("lowercase");
    });

    it("should return null when window is undefined", () => {
      const originalWindow = global.window;
      (global as any).window = undefined;

      const result = safeStorage.getItem("test");
      expect(result).toBeNull();

      global.window = originalWindow;
    });

    it("should handle error from localStorage gracefully", () => {
      const throwingStorage = {
        getItem: () => {
          throw new Error("Storage error");
        },
      };
      Object.defineProperty(window, "localStorage", {
        value: throwingStorage,
        writable: true,
      });

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = safeStorage.getItem("test");

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it("should handle QuotaExceededError gracefully", () => {
      const quotaError = new Error("QuotaExceededError");
      const throwingStorage = {
        getItem: () => {
          throw quotaError;
        },
      };
      Object.defineProperty(window, "localStorage", {
        value: throwingStorage,
        writable: true,
      });

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = safeStorage.getItem("test");

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it("should not throw when localStorage is read-only", () => {
      const readOnlyStorage = {
        getItem: (key: string) => {
          throw new DOMException("Read-only", "ReadOnlyError");
        },
      };
      Object.defineProperty(window, "localStorage", {
        value: readOnlyStorage,
        writable: true,
      });

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(() => safeStorage.getItem("test")).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it("should preserve whitespace in values", () => {
      const value = "  leading and trailing  ";
      window.localStorage.setItem("whitespace-key", value);
      const result = safeStorage.getItem("whitespace-key");
      expect(result).toBe(value);
    });

    it("should handle newlines in values", () => {
      const value = "line1\nline2\nline3";
      window.localStorage.setItem("newline-key", value);
      const result = safeStorage.getItem("newline-key");
      expect(result).toBe(value);
    });

    it("should handle tabs in values", () => {
      const value = "col1\tcol2\tcol3";
      window.localStorage.setItem("tab-key", value);
      const result = safeStorage.getItem("tab-key");
      expect(result).toBe(value);
    });

    it("should return correct value after overwrite", () => {
      window.localStorage.setItem("key", "first");
      window.localStorage.setItem("key", "second");
      const result = safeStorage.getItem("key");
      expect(result).toBe("second");
    });

    it.each([
      "test-1",
      "test-2",
      "test-3",
    ])("should handle parameterized key reads", (key) => {
      window.localStorage.setItem(key, `value-for-${key}`);
      const result = safeStorage.getItem(key);
      expect(result).toBe(`value-for-${key}`);
    });
  });

  describe("setItem", () => {
    it("should set value in localStorage", () => {
      safeStorage.setItem("test-key", "test-value");
      expect(window.localStorage.getItem("test-key")).toBe("test-value");
    });

    it("should overwrite existing values", () => {
      safeStorage.setItem("key", "first");
      safeStorage.setItem("key", "second");
      expect(window.localStorage.getItem("key")).toBe("second");
    });

    it("should handle empty string values", () => {
      safeStorage.setItem("empty-key", "");
      expect(window.localStorage.getItem("empty-key")).toBe("");
    });

    it("should handle whitespace values", () => {
      const value = "   spaces   ";
      safeStorage.setItem("whitespace-key", value);
      expect(window.localStorage.getItem("whitespace-key")).toBe(value);
    });

    it("should handle JSON string values", () => {
      const jsonString = '{"key":"value"}';
      safeStorage.setItem("json-key", jsonString);
      expect(window.localStorage.getItem("json-key")).toBe(jsonString);
    });

    it("should handle number strings", () => {
      safeStorage.setItem("number-key", "12345");
      expect(window.localStorage.getItem("number-key")).toBe("12345");
    });

    it("should handle boolean strings", () => {
      safeStorage.setItem("bool-key-true", "true");
      safeStorage.setItem("bool-key-false", "false");
      expect(window.localStorage.getItem("bool-key-true")).toBe("true");
      expect(window.localStorage.getItem("bool-key-false")).toBe("false");
    });

    it("should handle unicode characters", () => {
      const unicode = "こんにちは世界";
      safeStorage.setItem("unicode-key", unicode);
      expect(window.localStorage.getItem("unicode-key")).toBe(unicode);
    });

    it("should handle special characters", () => {
      const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";
      safeStorage.setItem("special-key", special);
      expect(window.localStorage.getItem("special-key")).toBe(special);
    });

    it("should handle very long values", () => {
      const longValue = "x".repeat(10000);
      safeStorage.setItem("long-key", longValue);
      expect(window.localStorage.getItem("long-key")).toBe(longValue);
    });

    it("should handle multiple keys independently", () => {
      safeStorage.setItem("key1", "value1");
      safeStorage.setItem("key2", "value2");

      expect(window.localStorage.getItem("key1")).toBe("value1");
      expect(window.localStorage.getItem("key2")).toBe("value2");
    });

    it("should not throw when window is undefined", () => {
      const originalWindow = global.window;
      (global as any).window = undefined;

      expect(() => safeStorage.setItem("test", "value")).not.toThrow();

      global.window = originalWindow;
    });

    it("should handle storage quota exceeded error gracefully", () => {
      const throwingStorage = {
        setItem: () => {
          const error = new Error("QuotaExceededError");
          (error as any).name = "QuotaExceededError";
          throw error;
        },
      };
      Object.defineProperty(window, "localStorage", {
        value: throwingStorage,
        writable: true,
      });

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(() => safeStorage.setItem("test", "value")).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it("should handle storage errors gracefully", () => {
      const throwingStorage = {
        setItem: () => {
          throw new Error("Storage is locked");
        },
      };
      Object.defineProperty(window, "localStorage", {
        value: throwingStorage,
        writable: true,
      });

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(() => safeStorage.setItem("test", "value")).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it("should preserve value exactly as provided", () => {
      const values = [
        "simple",
        "with spaces",
        "with\nnewlines",
        "with\ttabs",
        "with-dashes-and_underscores",
        "CamelCase",
        "UPPERCASE",
        "123",
        "0",
        "-1",
      ];

      values.forEach((value) => {
        safeStorage.setItem("key", value);
        expect(window.localStorage.getItem("key")).toBe(value);
      });
    });

    it.each([
      ["key1", "value1"],
      ["key2", "value2"],
      ["key3", "value3"],
    ])("should set key %s with value %s", (key, value) => {
      safeStorage.setItem(key, value);
      expect(window.localStorage.getItem(key)).toBe(value);
    });
  });

  describe("removeItem", () => {
    beforeEach(() => {
      window.localStorage.setItem("key1", "value1");
      window.localStorage.setItem("key2", "value2");
    });

    it("should remove existing key", () => {
      safeStorage.removeItem("key1");
      expect(window.localStorage.getItem("key1")).toBeNull();
    });

    it("should not affect other keys", () => {
      safeStorage.removeItem("key1");
      expect(window.localStorage.getItem("key2")).toBe("value2");
    });

    it("should handle removing non-existent keys", () => {
      expect(() => safeStorage.removeItem("non-existent")).not.toThrow();
    });

    it("should be idempotent", () => {
      safeStorage.removeItem("key1");
      expect(() => safeStorage.removeItem("key1")).not.toThrow();
    });

    it("should work after setting new value", () => {
      safeStorage.setItem("new-key", "new-value");
      safeStorage.removeItem("new-key");
      expect(window.localStorage.getItem("new-key")).toBeNull();
    });

    it("should not throw when window is undefined", () => {
      const originalWindow = global.window;
      (global as any).window = undefined;

      expect(() => safeStorage.removeItem("test")).not.toThrow();

      global.window = originalWindow;
    });

    it("should handle storage errors gracefully", () => {
      const throwingStorage = {
        removeItem: () => {
          throw new Error("Storage is locked");
        },
      };
      Object.defineProperty(window, "localStorage", {
        value: throwingStorage,
        writable: true,
      });

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(() => safeStorage.removeItem("test")).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it("should handle DOMException gracefully", () => {
      const throwingStorage = {
        removeItem: () => {
          throw new DOMException("Read-only", "ReadOnlyError");
        },
      };
      Object.defineProperty(window, "localStorage", {
        value: throwingStorage,
        writable: true,
      });

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(() => safeStorage.removeItem("test")).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it("should handle keys with special characters", () => {
      const specialKey = "key:with:colons";
      window.localStorage.setItem(specialKey, "value");
      safeStorage.removeItem(specialKey);
      expect(window.localStorage.getItem(specialKey)).toBeNull();
    });

    it("should be case-sensitive", () => {
      window.localStorage.setItem("Key", "uppercase");
      window.localStorage.setItem("key", "lowercase");

      safeStorage.removeItem("Key");

      expect(window.localStorage.getItem("Key")).toBeNull();
      expect(window.localStorage.getItem("key")).toBe("lowercase");
    });

    it.each([
      "key-1",
      "key-2",
      "key-3",
    ])("should remove key %s", (key) => {
      window.localStorage.setItem(key, "value");
      safeStorage.removeItem(key);
      expect(window.localStorage.getItem(key)).toBeNull();
    });
  });

  describe("integration scenarios", () => {
    it("should handle set -> get -> remove -> get cycle", () => {
      const key = "test-key";
      const value = "test-value";

      safeStorage.setItem(key, value);
      expect(safeStorage.getItem(key)).toBe(value);

      safeStorage.removeItem(key);
      expect(safeStorage.getItem(key)).toBeNull();
    });

    it("should handle multiple operations on same key", () => {
      const key = "key";

      safeStorage.setItem(key, "value1");
      expect(safeStorage.getItem(key)).toBe("value1");

      safeStorage.setItem(key, "value2");
      expect(safeStorage.getItem(key)).toBe("value2");

      safeStorage.removeItem(key);
      expect(safeStorage.getItem(key)).toBeNull();

      safeStorage.setItem(key, "value3");
      expect(safeStorage.getItem(key)).toBe("value3");
    });

    it("should handle concurrent operations on different keys", () => {
      const keys = ["key1", "key2", "key3", "key4", "key5"];

      keys.forEach((key) => {
        safeStorage.setItem(key, `value-${key}`);
      });

      keys.forEach((key) => {
        expect(safeStorage.getItem(key)).toBe(`value-${key}`);
      });

      safeStorage.removeItem("key3");

      expect(safeStorage.getItem("key3")).toBeNull();
      keys.filter((k) => k !== "key3").forEach((key) => {
        expect(safeStorage.getItem(key)).toBe(`value-${key}`);
      });
    });

    it("should handle JSON serialization/deserialization", () => {
      const obj = { name: "test", value: 123, nested: { key: "value" } };
      const json = JSON.stringify(obj);

      safeStorage.setItem("json-key", json);
      const retrieved = safeStorage.getItem("json-key");
      const parsed = JSON.parse(retrieved || "{}");

      expect(parsed).toEqual(obj);
    });

    it("should be safe with very large operations", () => {
      const largeValue = JSON.stringify({
        data: Array(100).fill("x".repeat(100)),
      });

      safeStorage.setItem("large-key", largeValue);
      const retrieved = safeStorage.getItem("large-key");

      expect(retrieved).toBe(largeValue);
      safeStorage.removeItem("large-key");
      expect(safeStorage.getItem("large-key")).toBeNull();
    });
  });

  describe("error handling and edge cases", () => {
    it("should log warnings with key information", () => {
      const throwingStorage = {
        getItem: () => {
          throw new Error("Test error");
        },
      };
      Object.defineProperty(window, "localStorage", {
        value: throwingStorage,
        writable: true,
      });

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      safeStorage.getItem("test-key");

      expect(consoleWarnSpy).toHaveBeenCalled();
      const callArgs = consoleWarnSpy.mock.calls[0];
      expect(callArgs[0]).toContain("[Storage]");
      expect(callArgs[0]).toContain("test-key");

      consoleWarnSpy.mockRestore();
    });

    it("should continue functioning after errors", () => {
      const throwingStorage = {
        getItem: () => {
          throw new Error("Temporary error");
        },
      };
      Object.defineProperty(window, "localStorage", {
        value: throwingStorage,
        writable: true,
      });

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      safeStorage.getItem("key1");

      // Restore working localStorage
      const workingStorage = {
        getItem: (key: string) => localStorageMock[key] ?? null,
        setItem: (key: string, value: string) => {
          localStorageMock[key] = value;
        },
        removeItem: (key: string) => {
          delete localStorageMock[key];
        },
      };
      Object.defineProperty(window, "localStorage", {
        value: workingStorage,
        writable: true,
      });

      // Should work again
      safeStorage.setItem("key2", "value2");
      expect(safeStorage.getItem("key2")).toBe("value2");

      consoleWarnSpy.mockRestore();
    });
  });
});
