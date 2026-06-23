import { describe, it, expect } from "vitest";

// Object utilities
function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result as Omit<T, K>;
}

function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const output = { ...target };
  Object.keys(source).forEach(key => {
    if (
      source[key as keyof T] !== null &&
      typeof source[key as keyof T] === "object" &&
      !Array.isArray(source[key as keyof T])
    ) {
      output[key as keyof T] = deepMerge(
        target[key as keyof T] || {},
        source[key as keyof T] as any
      );
    } else {
      output[key as keyof T] = source[key as keyof T]!;
    }
  });
  return output;
}

function invert<T extends Record<string, string>>(obj: T): Record<string, string> {
  const result: Record<string, string> = {};
  Object.entries(obj).forEach(([key, value]) => {
    result[value] = key;
  });
  return result;
}

function filterObject<T extends object>(
  obj: T,
  predicate: (value: any, key: string) => boolean
): Partial<T> {
  const result: any = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (predicate(value, key)) {
      result[key] = value;
    }
  });
  return result;
}

function mapValues<T extends object, U>(
  obj: T,
  fn: (value: any, key: string) => U
): Record<string, U> {
  const result: Record<string, U> = {};
  Object.entries(obj).forEach(([key, value]) => {
    result[key] = fn(value, key);
  });
  return result;
}

// Number utilities
function round(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function floor(value: number): number {
  return Math.floor(value);
}

function ceil(value: number): number {
  return Math.ceil(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function between(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function min(...values: number[]): number {
  return Math.min(...values);
}

function max(...values: number[]): number {
  return Math.max(...values);
}

function sum(values: number[]): number {
  return values.reduce((acc, val) => acc + val, 0);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

function percentageOf(value: number, percent: number): number {
  return (value * percent) / 100;
}

function isEven(value: number): boolean {
  return value % 2 === 0;
}

function isOdd(value: number): boolean {
  return value % 2 !== 0;
}

function isPrime(value: number): boolean {
  if (value < 2) return false;
  if (value === 2) return true;
  if (isEven(value)) return false;
  for (let i = 3; i <= Math.sqrt(value); i += 2) {
    if (value % i === 0) return false;
  }
  return true;
}

describe("omit", () => {
  it("removes specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = omit(obj, ["b"] as const);
    expect(result).toEqual({ a: 1, c: 3 });
  });

  it("handles multiple keys", () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    const result = omit(obj, ["b", "d"] as const);
    expect(result).toEqual({ a: 1, c: 3 });
  });

  it("returns new object", () => {
    const obj = { a: 1 };
    const result = omit(obj, ["a"] as const);
    expect(result).not.toBe(obj);
  });
});

describe("pick", () => {
  it("selects specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = pick(obj, ["a", "c"] as const);
    expect(result).toEqual({ a: 1, c: 3 });
  });

  it("handles missing keys gracefully", () => {
    const obj = { a: 1, b: 2 };
    const result = pick(obj, ["a", "c"] as const);
    expect(result).toEqual({ a: 1 });
  });

  it("returns new object", () => {
    const obj = { a: 1 };
    const result = pick(obj, ["a"] as const);
    expect(result).not.toBe(obj);
  });
});

describe("deepMerge", () => {
  it("merges flat objects", () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    expect(deepMerge(target, source)).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("merges nested objects", () => {
    const target = { a: { x: 1, y: 2 }, b: 3 };
    const source = { a: { y: 20 } };
    const result = deepMerge(target, source);
    expect(result.a).toEqual({ x: 1, y: 20 });
  });

  it("overwrites non-object values", () => {
    const target = { a: 1 };
    const source = { a: 2 };
    expect(deepMerge(target, source)).toEqual({ a: 2 });
  });

  it("returns new object", () => {
    const target = { a: 1 };
    const source = { b: 2 };
    const result = deepMerge(target, source);
    expect(result).not.toBe(target);
  });
});

describe("invert", () => {
  it("inverts key-value pairs", () => {
    const obj = { a: "x", b: "y", c: "z" };
    const result = invert(obj);
    expect(result).toEqual({ x: "a", y: "b", z: "c" });
  });

  it("handles duplicate values (last wins)", () => {
    const obj = { a: "x", b: "x" };
    const result = invert(obj);
    expect(result.x).toBe("b");
  });
});

describe("filterObject", () => {
  it("filters by predicate", () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    const result = filterObject(obj, (val) => val > 2);
    expect(result).toEqual({ c: 3, d: 4 });
  });

  it("filters by key", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = filterObject(obj, (_, key) => key !== "b");
    expect(result).toEqual({ a: 1, c: 3 });
  });

  it("handles empty result", () => {
    const obj = { a: 1, b: 2 };
    const result = filterObject(obj, () => false);
    expect(result).toEqual({});
  });
});

describe("mapValues", () => {
  it("transforms values", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = mapValues(obj, (val) => val * 2);
    expect(result).toEqual({ a: 2, b: 4, c: 6 });
  });

  it("transforms with key access", () => {
    const obj = { a: 1, b: 2 };
    const result = mapValues(obj, (val, key) => `${key}:${val}`);
    expect(result).toEqual({ a: "a:1", b: "b:2" });
  });

  it("transforms to different type", () => {
    const obj = { a: "x", b: "y" };
    const result = mapValues(obj, (val) => val.length);
    expect(result).toEqual({ a: 1, b: 1 });
  });
});

describe("round", () => {
  it.each([
    { value: 3.14159, decimals: 2, expected: 3.14 },
    { value: 3.5, decimals: 0, expected: 4 },
    { value: 1.234, decimals: 1, expected: 1.2 },
    { value: 5.555, decimals: 2, expected: 5.56 },
  ])("rounds $value to $decimals decimals", ({ value, decimals, expected }) => {
    expect(round(value, decimals)).toBe(expected);
  });
});

describe("floor", () => {
  it.each([
    { value: 3.9, expected: 3 },
    { value: 3.1, expected: 3 },
    { value: -3.1, expected: -4 },
    { value: 5, expected: 5 },
  ])("floors $value to $expected", ({ value, expected }) => {
    expect(floor(value)).toBe(expected);
  });
});

describe("ceil", () => {
  it.each([
    { value: 3.1, expected: 4 },
    { value: 3.9, expected: 4 },
    { value: -3.9, expected: -3 },
    { value: 5, expected: 5 },
  ])("ceils $value to $expected", ({ value, expected }) => {
    expect(ceil(value)).toBe(expected);
  });
});

describe("clamp", () => {
  it.each([
    { value: 5, min: 0, max: 10, expected: 5 },
    { value: -5, min: 0, max: 10, expected: 0 },
    { value: 15, min: 0, max: 10, expected: 10 },
  ])("clamps $value between $min and $max", ({ value, min, max, expected }) => {
    expect(clamp(value, min, max)).toBe(expected);
  });
});

describe("between", () => {
  it.each([
    { value: 5, min: 0, max: 10, expected: true },
    { value: 0, min: 0, max: 10, expected: true },
    { value: 10, min: 0, max: 10, expected: true },
    { value: -1, min: 0, max: 10, expected: false },
    { value: 11, min: 0, max: 10, expected: false },
  ])("checks if $value is between $min and $max", ({ value, min, max, expected }) => {
    expect(between(value, min, max)).toBe(expected);
  });
});

describe("min", () => {
  it("finds minimum", () => {
    expect(min(5, 2, 8, 1, 9)).toBe(1);
  });

  it("handles single value", () => {
    expect(min(42)).toBe(42);
  });

  it("handles negative numbers", () => {
    expect(min(-5, -2, -10)).toBe(-10);
  });
});

describe("max", () => {
  it("finds maximum", () => {
    expect(max(5, 2, 8, 1, 9)).toBe(9);
  });

  it("handles single value", () => {
    expect(max(42)).toBe(42);
  });
});

describe("sum", () => {
  it.each([
    { values: [1, 2, 3], expected: 6 },
    { values: [0], expected: 0 },
    { values: [-1, -2, -3], expected: -6 },
    { values: [1.5, 2.5, 3], expected: 7 },
    { values: [], expected: 0 },
  ])("sums $values correctly", ({ values, expected }) => {
    expect(sum(values)).toBe(expected);
  });
});

describe("average", () => {
  it.each([
    { values: [1, 2, 3], expected: 2 },
    { values: [10, 20], expected: 15 },
    { values: [5], expected: 5 },
    { values: [], expected: 0 },
  ])("averages $values correctly", ({ values, expected }) => {
    expect(average(values)).toBe(expected);
  });
});

describe("percentage", () => {
  it.each([
    { value: 50, total: 100, expected: 50 },
    { value: 1, total: 4, expected: 25 },
    { value: 3, total: 10, expected: 30 },
    { value: 0, total: 100, expected: 0 },
    { value: 100, total: 0, expected: 0 },
  ])("calculates percentage of $value from $total", ({ value, total, expected }) => {
    expect(percentage(value, total)).toBe(expected);
  });
});

describe("percentageOf", () => {
  it.each([
    { value: 100, percent: 50, expected: 50 },
    { value: 200, percent: 25, expected: 50 },
    { value: 80, percent: 12.5, expected: 10 },
  ])("calculates $percent% of $value", ({ value, percent, expected }) => {
    expect(percentageOf(value, percent)).toBe(expected);
  });
});

describe("isEven", () => {
  it.each([
    { value: 0, expected: true },
    { value: 2, expected: true },
    { value: -4, expected: true },
    { value: 1, expected: false },
    { value: 3, expected: false },
    { value: -5, expected: false },
  ])("correctly identifies even: $value", ({ value, expected }) => {
    expect(isEven(value)).toBe(expected);
  });
});

describe("isOdd", () => {
  it.each([
    { value: 1, expected: true },
    { value: 3, expected: true },
    { value: -5, expected: true },
    { value: 0, expected: false },
    { value: 2, expected: false },
    { value: -4, expected: false },
  ])("correctly identifies odd: $value", ({ value, expected }) => {
    expect(isOdd(value)).toBe(expected);
  });
});

describe("isPrime", () => {
  it.each([
    { value: 2, expected: true },
    { value: 3, expected: true },
    { value: 5, expected: true },
    { value: 7, expected: true },
    { value: 11, expected: true },
    { value: 1, expected: false },
    { value: 0, expected: false },
    { value: -5, expected: false },
    { value: 4, expected: false },
    { value: 6, expected: false },
  ])("correctly identifies prime: $value", ({ value, expected }) => {
    expect(isPrime(value)).toBe(expected);
  });
});
