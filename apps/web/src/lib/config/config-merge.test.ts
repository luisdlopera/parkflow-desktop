import { describe, it, expect } from "vitest";
import { deepMergeSafe } from "./config-merge";

describe("deepMergeSafe", () => {
  it("merges simple flat objects", () => {
    const base = { a: 1, b: 2 };
    const override = { b: 3, c: 4 };
    const result = deepMergeSafe(base, override);

    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("overwrites base values with override", () => {
    const base = { name: "Alice", age: 30 };
    const override = { age: 31 };
    const result = deepMergeSafe(base, override);

    expect(result.age).toBe(31);
    expect(result.name).toBe("Alice");
  });

  it.each([
    [{ a: 1 }, { a: 2 }, { a: 2 }],
    [{ x: "old" }, { x: "new" }, { x: "new" }],
    [{ val: 0 }, { val: 1 }, { val: 1 }],
  ])("overwrites values: %p + %p -> %p", (base, override, expected) => {
    const result = deepMergeSafe(base, override);
    expect(result).toEqual(expected);
  });

  it("adds new keys from override", () => {
    const base = { a: 1 };
    const override = { b: 2, c: 3 };
    const result = deepMergeSafe(base, override);

    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("preserves base keys not in override", () => {
    const base = { a: 1, b: 2, c: 3 };
    const override = { b: 20 };
    const result = deepMergeSafe(base, override);

    expect(result).toEqual({ a: 1, b: 20, c: 3 });
  });

  it("deeply merges nested objects", () => {
    const base = {
      user: { name: "Alice", age: 30 },
      settings: { theme: "dark" },
    };
    const override = {
      user: { age: 31 },
      settings: { lang: "es" },
    };
    const result = deepMergeSafe(base, override);

    expect(result).toEqual({
      user: { name: "Alice", age: 31 },
      settings: { theme: "dark", lang: "es" },
    });
  });

  it("handles nested overrides", () => {
    const base = { config: { db: { host: "localhost", port: 5432 } } };
    const override = { config: { db: { port: 3306 } } };
    const result = deepMergeSafe(base, override);

    expect(result.config.db.host).toBe("localhost");
    expect(result.config.db.port).toBe(3306);
  });

  it.each([
    [
      { a: { b: 1 } },
      { a: { b: 2 } },
      { a: { b: 2 } },
    ],
    [
      { x: { y: { z: 1 } } },
      { x: { y: { z: 2 } } },
      { x: { y: { z: 2 } } },
    ],
  ])("deeply merges nested: %p + %p -> %p", (base, override, expected) => {
    const result = deepMergeSafe(base, override);
    expect(result).toEqual(expected);
  });

  it("replaces arrays instead of merging them", () => {
    const base = { items: [1, 2, 3] };
    const override = { items: [4, 5] };
    const result = deepMergeSafe(base, override);

    expect(result.items).toEqual([4, 5]);
  });

  it("skips undefined values in override", () => {
    const base = { a: 1, b: 2 };
    const override = { b: undefined };
    const result = deepMergeSafe(base, override);

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it.each([
    [{ a: 1 }, { a: undefined }, { a: 1 }],
    [{ x: "keep" }, { x: undefined }, { x: "keep" }],
  ])("skips undefined: %p + %p -> %p", (base, override, expected) => {
    const result = deepMergeSafe(base, override);
    expect(result).toEqual(expected);
  });

  it("handles null values from override", () => {
    const base = { a: 1, b: 2 };
    const override = { b: null };
    const result = deepMergeSafe(base, override);

    expect(result.b).toBeNull();
  });

  it("handles empty override object", () => {
    const base = { a: 1, b: 2 };
    const override = {};
    const result = deepMergeSafe(base, override);

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("handles empty base object", () => {
    const base = {};
    const override = { a: 1, b: 2 };
    const result = deepMergeSafe(base, override);

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("handles null override gracefully", () => {
    const base = { a: 1 };
    const result = deepMergeSafe(base, null as any);

    expect(result).toEqual({ a: 1 });
  });

  it("handles undefined override gracefully", () => {
    const base = { a: 1 };
    const result = deepMergeSafe(base, undefined as any);

    expect(result).toEqual({ a: 1 });
  });

  it("does not mutate base object", () => {
    const base = { a: { b: 1 } };
    const baseCopy = JSON.parse(JSON.stringify(base));
    const override = { a: { b: 2 } };

    deepMergeSafe(base, override);

    expect(base).toEqual(baseCopy);
  });

  it("does not mutate override object", () => {
    const base = { a: 1 };
    const override = { b: 2 };
    const overrideCopy = JSON.parse(JSON.stringify(override));

    deepMergeSafe(base, override);

    expect(override).toEqual(overrideCopy);
  });

  it("handles deeply nested structures", () => {
    const base = {
      level1: {
        level2: {
          level3: {
            value: "original",
          },
        },
      },
    };
    const override = {
      level1: {
        level2: {
          level3: {
            value: "updated",
          },
        },
      },
    };
    const result = deepMergeSafe(base, override);

    expect(result.level1.level2.level3.value).toBe("updated");
  });

  it("handles mixed types correctly", () => {
    const base = {
      string: "text",
      number: 42,
      boolean: true,
      nested: { value: 1 },
      array: [1, 2, 3],
    };
    const override = {
      string: "updated",
      number: 100,
      boolean: false,
      nested: { value: 2 },
      array: [4, 5],
    };
    const result = deepMergeSafe(base, override);

    expect(result.string).toBe("updated");
    expect(result.number).toBe(100);
    expect(result.boolean).toBe(false);
    expect(result.nested.value).toBe(2);
    expect(result.array).toEqual([4, 5]);
  });

  it("handles special JSON values", () => {
    const base = { a: 1 };
    const override = { b: null, c: false, d: 0, e: "" };
    const result = deepMergeSafe(base, override);

    expect(result.b).toBeNull();
    expect(result.c).toBe(false);
    expect(result.d).toBe(0);
    expect(result.e).toBe("");
  });

  it.each([
    [{ a: 1 }, { a: 1 }, { a: 1 }],
    [{ a: 1, b: 2 }, { a: 1 }, { a: 1, b: 2 }],
    [{ a: { b: 1 } }, { a: { b: 1 } }, { a: { b: 1 } }],
  ])("idempotent merge: %p", (base, override, expected) => {
    const result1 = deepMergeSafe(base, override);
    const result2 = deepMergeSafe(result1, override);
    expect(result2).toEqual(expected);
  });

  it("handles configuration-like structures", () => {
    const baseConfig = {
      app: {
        name: "ParkFlow",
        version: "1.0.0",
        debug: false,
      },
      db: {
        host: "localhost",
        port: 5432,
      },
    };
    const overrideConfig = {
      app: {
        debug: true,
      },
      db: {
        port: 3306,
      },
    };
    const result = deepMergeSafe(baseConfig, overrideConfig);

    expect(result.app.name).toBe("ParkFlow");
    expect(result.app.debug).toBe(true);
    expect(result.db.host).toBe("localhost");
    expect(result.db.port).toBe(3306);
  });

  it("handles feature flags merging", () => {
    const baseFlags = {
      features: {
        newUI: false,
        betaAPI: false,
        darkMode: true,
      },
    };
    const overrideFlags = {
      features: {
        newUI: true,
        darkMode: false,
      },
    };
    const result = deepMergeSafe(baseFlags, overrideFlags);

    expect(result.features.newUI).toBe(true);
    expect(result.features.betaAPI).toBe(false);
    expect(result.features.darkMode).toBe(false);
  });
});
