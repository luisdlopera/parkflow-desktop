import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { safeStorage } from "../storage";

describe("safeStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("getItem", () => {
    it.each([
      ["key1", "value1"],
      ["key2", "value2"],
      ["my-data", "some-json-data"],
      ["token", "abc123xyz"],
      ["config.dark", "true"],
    ])("retrieves stored value for key %s", (key, value) => {
      localStorage.setItem(key, value);
      expect(safeStorage.getItem(key)).toBe(value);
    });

    it("returns null for missing key", () => {
      expect(safeStorage.getItem("nonexistent")).toBeNull();
    });

    it("handles empty string values", () => {
      localStorage.setItem("empty", "");
      expect(safeStorage.getItem("empty")).toBe("");
    });

    it("handles special characters in values", () => {
      const special = '{"data":"value","nested":{"key":"val"}}';
      localStorage.setItem("json", special);
      expect(safeStorage.getItem("json")).toBe(special);
    });

    it("handles numeric strings", () => {
      localStorage.setItem("number", "12345");
      expect(safeStorage.getItem("number")).toBe("12345");
    });

    it("handles unicode characters", () => {
      const unicode = "こんにちは世界";
      localStorage.setItem("unicode", unicode);
      expect(safeStorage.getItem("unicode")).toBe(unicode);
    });

    it("handles long string values", () => {
      const longValue = "x".repeat(10000);
      localStorage.setItem("long", longValue);
      expect(safeStorage.getItem("long")).toBe(longValue);
    });

    it("handles keys with special characters", () => {
      const key = "key-with:special.chars_123";
      localStorage.setItem(key, "value");
      expect(safeStorage.getItem(key)).toBe("value");
    });

    it("does not throw on repeated accesses", () => {
      localStorage.setItem("test", "value");
      expect(() => {
        safeStorage.getItem("test");
        safeStorage.getItem("test");
        safeStorage.getItem("test");
      }).not.toThrow();
    });

    it("handles values with line breaks", () => {
      const multiline = "line1\nline2\nline3";
      localStorage.setItem("multiline", multiline);
      expect(safeStorage.getItem("multiline")).toBe(multiline);
    });

    it("handles concurrent reads", () => {
      localStorage.setItem("key", "value");
      const v1 = safeStorage.getItem("key");
      const v2 = safeStorage.getItem("key");
      const v3 = safeStorage.getItem("key");
      expect(v1).toBe(v2);
      expect(v2).toBe(v3);
    });
  });

  describe("setItem", () => {
    it.each([
      ["key1", "value1"],
      ["key2", "value2"],
      ["settings", '{"theme":"dark"}'],
      ["id", "uuid-1234-5678"],
      ["count", "42"],
    ])("stores value for key %s", (key, value) => {
      safeStorage.setItem(key, value);
      expect(localStorage.getItem(key)).toBe(value);
    });

    it("overwrites existing values", () => {
      safeStorage.setItem("key", "old");
      safeStorage.setItem("key", "new");
      expect(safeStorage.getItem("key")).toBe("new");
    });

    it("stores empty string", () => {
      safeStorage.setItem("empty", "");
      expect(safeStorage.getItem("empty")).toBe("");
    });

    it("stores JSON strings", () => {
      const json = '{"id":1,"name":"test"}';
      safeStorage.setItem("json", json);
      expect(safeStorage.getItem("json")).toBe(json);
    });

    it("stores unicode values", () => {
      const unicode = "Ñoño 中文 العربية";
      safeStorage.setItem("unicode", unicode);
      expect(safeStorage.getItem("unicode")).toBe(unicode);
    });

    it("stores large values", () => {
      const large = "x".repeat(100000);
      safeStorage.setItem("large", large);
      expect(safeStorage.getItem("large")).toBe(large);
    });

    it("stores multiple items independently", () => {
      safeStorage.setItem("item1", "value1");
      safeStorage.setItem("item2", "value2");
      safeStorage.setItem("item3", "value3");
      expect(safeStorage.getItem("item1")).toBe("value1");
      expect(safeStorage.getItem("item2")).toBe("value2");
      expect(safeStorage.getItem("item3")).toBe("value3");
    });

    it("handles values with tabs and special whitespace", () => {
      const special = "line1\tline2\rline3";
      safeStorage.setItem("special", special);
      expect(safeStorage.getItem("special")).toBe(special);
    });

    it("does not throw on write", () => {
      expect(() => safeStorage.setItem("key", "value")).not.toThrow();
    });
  });

  describe("removeItem", () => {
    it.each([
      ["key1"],
      ["key2"],
      ["data.nested"],
      ["config-value"],
      ["123"],
    ])("removes stored item with key %s", (key) => {
      localStorage.setItem(key, "value");
      safeStorage.removeItem(key);
      expect(localStorage.getItem(key)).toBeNull();
    });

    it("does not throw when removing nonexistent key", () => {
      expect(() => safeStorage.removeItem("nonexistent")).not.toThrow();
    });

    it("removes only specified item", () => {
      localStorage.setItem("keep1", "value1");
      localStorage.setItem("remove", "value");
      localStorage.setItem("keep2", "value2");
      safeStorage.removeItem("remove");
      expect(safeStorage.getItem("keep1")).toBe("value1");
      expect(safeStorage.getItem("keep2")).toBe("value2");
      expect(safeStorage.getItem("remove")).toBeNull();
    });

    it("can remove item after retrieval", () => {
      localStorage.setItem("temp", "value");
      expect(safeStorage.getItem("temp")).toBe("value");
      safeStorage.removeItem("temp");
      expect(safeStorage.getItem("temp")).toBeNull();
    });

    it("handles removing the same item twice", () => {
      localStorage.setItem("item", "value");
      safeStorage.removeItem("item");
      expect(() => safeStorage.removeItem("item")).not.toThrow();
      expect(safeStorage.getItem("item")).toBeNull();
    });

    it("removes items with special character keys", () => {
      const key = "key-with:special.chars";
      localStorage.setItem(key, "value");
      safeStorage.removeItem(key);
      expect(localStorage.getItem(key)).toBeNull();
    });

    it("does not throw on remove", () => {
      expect(() => safeStorage.removeItem("any")).not.toThrow();
    });
  });

  describe("integration scenarios", () => {
    it("can store and retrieve complex JSON", () => {
      const data = {
        user: { id: 1, name: "John", email: "john@example.com" },
        settings: { theme: "dark", notifications: true },
        tags: ["admin", "user", "superuser"],
      };
      const json = JSON.stringify(data);
      safeStorage.setItem("userData", json);
      const retrieved = safeStorage.getItem("userData");
      expect(retrieved).toBe(json);
      expect(JSON.parse(retrieved!)).toEqual(data);
    });

    it("handles complete storage lifecycle", () => {
      const key = "lifecycle";
      expect(safeStorage.getItem(key)).toBeNull();
      safeStorage.setItem(key, "initial");
      expect(safeStorage.getItem(key)).toBe("initial");
      safeStorage.setItem(key, "updated");
      expect(safeStorage.getItem(key)).toBe("updated");
      safeStorage.removeItem(key);
      expect(safeStorage.getItem(key)).toBeNull();
    });

    it("maintains isolation between different keys", () => {
      const pairs = [
        ["key1", "value1"],
        ["key2", "value2"],
        ["key3", "value3"],
      ];
      pairs.forEach(([k, v]) => safeStorage.setItem(k, v));
      pairs.forEach(([k, v]) => expect(safeStorage.getItem(k)).toBe(v));
      safeStorage.removeItem("key2");
      expect(safeStorage.getItem("key1")).toBe("value1");
      expect(safeStorage.getItem("key2")).toBeNull();
      expect(safeStorage.getItem("key3")).toBe("value3");
    });

    it("handles rapid operations", () => {
      for (let i = 0; i < 100; i++) {
        safeStorage.setItem(`key${i}`, `value${i}`);
      }
      for (let i = 0; i < 100; i++) {
        expect(safeStorage.getItem(`key${i}`)).toBe(`value${i}`);
      }
    });

    it("handles deep object nesting", () => {
      const deep = {
        l1: { l2: { l3: { l4: { l5: { data: "deep" } } } } },
      };
      const json = JSON.stringify(deep);
      safeStorage.setItem("deep", json);
      expect(JSON.parse(safeStorage.getItem("deep")!)).toEqual(deep);
    });

    it("overwrites old data cleanly", () => {
      safeStorage.setItem("data", '{"old":"true"}');
      safeStorage.setItem("data", '{"new":"true"}');
      const result = JSON.parse(safeStorage.getItem("data")!);
      expect(result.old).toBeUndefined();
      expect(result.new).toBe("true");
    });
  });
});
