import { describe, it, expect, beforeEach, vi } from "vitest";
import { safeStorage } from "./storage";

describe("safeStorage.getItem", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("retrieves stored values", () => {
    localStorage.setItem("key", "value");
    const result = safeStorage.getItem("key");
    expect(result).toBe("value");
  });

  it("returns null for non-existent keys", () => {
    const result = safeStorage.getItem("nonexistent");
    expect(result).toBeNull();
  });

  it.each([
    ["key1", "value1"],
    ["key2", "value2"],
    ["key3", "value3"],
  ])("retrieves %p -> %p", (key, value) => {
    localStorage.setItem(key, value);
    expect(safeStorage.getItem(key)).toBe(value);
  });

  it("handles empty string values", () => {
    localStorage.setItem("empty", "");
    const result = safeStorage.getItem("empty");
    expect(result).toBe("");
  });

  it("handles JSON string values", () => {
    const json = JSON.stringify({ a: 1, b: 2 });
    localStorage.setItem("json", json);
    const result = safeStorage.getItem("json");
    expect(result).toBe(json);
    expect(JSON.parse(result!)).toEqual({ a: 1, b: 2 });
  });

  it("returns null on undefined window (SSR)", () => {
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;

    const result = safeStorage.getItem("key");
    expect(result).toBeNull();

    global.window = originalWindow;
  });

  it("handles special characters in keys", () => {
    const key = "key-with:special.chars!@#$";
    localStorage.setItem(key, "value");
    expect(safeStorage.getItem(key)).toBe("value");
  });

  it("handles special characters in values", () => {
    const value = "!@#$%^&*(){}[]|\\:;<>?,./";
    localStorage.setItem("key", value);
    expect(safeStorage.getItem("key")).toBe(value);
  });

  it("handles unicode values", () => {
    const value = "测试用户-тест-テスト";
    localStorage.setItem("key", value);
    expect(safeStorage.getItem("key")).toBe(value);
  });

  it.each([
    "key",
    "a",
    "very-long-key-name-with-many-characters-and-segments",
  ])("handles various key formats: %p", (key) => {
    localStorage.setItem(key, "value");
    expect(safeStorage.getItem(key)).toBe("value");
  });
});

describe("safeStorage.setItem", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores values in localStorage", () => {
    safeStorage.setItem("key", "value");
    expect(localStorage.getItem("key")).toBe("value");
  });

  it.each([
    ["key1", "value1"],
    ["key2", "value2"],
    ["key3", "value3"],
  ])("stores %p -> %p", (key, value) => {
    safeStorage.setItem(key, value);
    expect(localStorage.getItem(key)).toBe(value);
  });

  it("overwrites existing values", () => {
    safeStorage.setItem("key", "value1");
    safeStorage.setItem("key", "value2");
    expect(localStorage.getItem("key")).toBe("value2");
  });

  it("stores empty strings", () => {
    safeStorage.setItem("empty", "");
    expect(localStorage.getItem("empty")).toBe("");
  });

  it("stores JSON strings", () => {
    const json = JSON.stringify({ a: 1, b: 2 });
    safeStorage.setItem("json", json);
    expect(localStorage.getItem("json")).toBe(json);
  });

  it("stores very long strings", () => {
    const longValue = "x".repeat(10000);
    safeStorage.setItem("long", longValue);
    expect(localStorage.getItem("long")).toBe(longValue);
  });

  it("handles special characters in keys", () => {
    safeStorage.setItem("key-with:special", "value");
    expect(localStorage.getItem("key-with:special")).toBe("value");
  });

  it("handles special characters in values", () => {
    const specialValue = "!@#$%^&*(){}[]|\\:;<>?,./";
    safeStorage.setItem("key", specialValue);
    expect(localStorage.getItem("key")).toBe(specialValue);
  });

  it("handles unicode in values", () => {
    const unicodeValue = "测试用户-тест-テスト";
    safeStorage.setItem("key", unicodeValue);
    expect(localStorage.getItem("key")).toBe(unicodeValue);
  });

  it("does not throw on undefined window (SSR)", () => {
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;

    expect(() => {
      safeStorage.setItem("key", "value");
    }).not.toThrow();

    global.window = originalWindow;
  });

  it("returns undefined", () => {
    const result = safeStorage.setItem("key", "value");
    expect(result).toBeUndefined();
  });

  it.each([
    ["key", "value"],
    ["a", "b"],
    ["x", ""],
  ])("stores various key-value pairs: %p -> %p", (key, value) => {
    safeStorage.setItem(key, value);
    expect(localStorage.getItem(key)).toBe(value);
  });
});

describe("safeStorage.removeItem", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes stored items", () => {
    localStorage.setItem("key", "value");
    safeStorage.removeItem("key");
    expect(localStorage.getItem("key")).toBeNull();
  });

  it.each([
    "key1",
    "key2",
    "key3",
  ])("removes item: %p", (key) => {
    localStorage.setItem(key, "value");
    safeStorage.removeItem(key);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("handles removing non-existent keys", () => {
    expect(() => {
      safeStorage.removeItem("nonexistent");
    }).not.toThrow();
  });

  it("handles removing already-removed keys", () => {
    localStorage.setItem("key", "value");
    safeStorage.removeItem("key");
    expect(() => {
      safeStorage.removeItem("key");
    }).not.toThrow();
  });

  it("does not affect other keys", () => {
    localStorage.setItem("key1", "value1");
    localStorage.setItem("key2", "value2");
    safeStorage.removeItem("key1");

    expect(localStorage.getItem("key1")).toBeNull();
    expect(localStorage.getItem("key2")).toBe("value2");
  });

  it("handles special characters in keys", () => {
    const key = "key-with:special.chars";
    localStorage.setItem(key, "value");
    safeStorage.removeItem(key);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("returns undefined", () => {
    localStorage.setItem("key", "value");
    const result = safeStorage.removeItem("key");
    expect(result).toBeUndefined();
  });

  it("does not throw on undefined window (SSR)", () => {
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;

    expect(() => {
      safeStorage.removeItem("key");
    }).not.toThrow();

    global.window = originalWindow;
  });

  it.each([
    "key1",
    "key2",
    "key3",
  ])("removes various keys: %p", (key) => {
    localStorage.setItem(key, "value");
    safeStorage.removeItem(key);
    expect(localStorage.getItem(key)).toBeNull();
  });
});

describe("safeStorage integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("supports full CRUD lifecycle", () => {
    const key = "test-key";
    const value = "test-value";

    // Create
    safeStorage.setItem(key, value);
    expect(safeStorage.getItem(key)).toBe(value);

    // Update
    safeStorage.setItem(key, "updated-value");
    expect(safeStorage.getItem(key)).toBe("updated-value");

    // Delete
    safeStorage.removeItem(key);
    expect(safeStorage.getItem(key)).toBeNull();
  });

  it("stores and retrieves multiple items", () => {
    const items = [
      { key: "user", value: "alice" },
      { key: "theme", value: "dark" },
      { key: "lang", value: "es" },
    ];

    items.forEach(({ key, value }) => {
      safeStorage.setItem(key, value);
    });

    items.forEach(({ key, value }) => {
      expect(safeStorage.getItem(key)).toBe(value);
    });
  });

  it("handles JSON serialization roundtrip", () => {
    const obj = { id: 1, name: "Alice", tags: ["a", "b"] };
    const json = JSON.stringify(obj);

    safeStorage.setItem("config", json);
    const retrieved = safeStorage.getItem("config");
    const parsed = JSON.parse(retrieved!);

    expect(parsed).toEqual(obj);
  });

  it("maintains isolation between keys", () => {
    safeStorage.setItem("key1", "value1");
    safeStorage.setItem("key2", "value2");
    safeStorage.setItem("key3", "value3");

    safeStorage.removeItem("key2");

    expect(safeStorage.getItem("key1")).toBe("value1");
    expect(safeStorage.getItem("key2")).toBeNull();
    expect(safeStorage.getItem("key3")).toBe("value3");
  });

  it("handles empty string key and value", () => {
    safeStorage.setItem("", "value");
    expect(safeStorage.getItem("")).toBe("value");

    safeStorage.setItem("key", "");
    expect(safeStorage.getItem("key")).toBe("");
  });

  it("safely handles concurrent operations", () => {
    const keys = Array.from({ length: 5 }, (_, i) => `key${i}`);

    keys.forEach((key, i) => {
      safeStorage.setItem(key, `value${i}`);
    });

    keys.forEach((key, i) => {
      expect(safeStorage.getItem(key)).toBe(`value${i}`);
    });

    keys.forEach((key) => {
      safeStorage.removeItem(key);
    });

    keys.forEach((key) => {
      expect(safeStorage.getItem(key)).toBeNull();
    });
  });
});
