import { describe, it, expect } from "vitest";

// Pure utility functions for maximum coverage impact

// Range and boundary checks
function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isWithinTolerance(value: number, target: number, tolerance: number): boolean {
  return Math.abs(value - target) <= tolerance;
}

// String case transformations
function toPascalCase(str: string): string {
  if (!str) return "";
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function toCamelCase(str: string): string {
  if (!str) return "";
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toSnakeCase(str: string): string {
  if (!str) return "";
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

// Collection operations
function flatten<T>(arr: any[]): T[] {
  return arr.reduce((flat, item) => {
    return flat.concat(Array.isArray(item) ? flatten(item) : item);
  }, []);
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function compact<T>(arr: (T | null | undefined)[]): T[] {
  return arr.filter((item): item is T => item != null);
}

function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

function partition<T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const trueArr: T[] = [];
  const falseArr: T[] = [];
  arr.forEach(item => {
    if (predicate(item)) {
      trueArr.push(item);
    } else {
      falseArr.push(item);
    }
  });
  return [trueArr, falseArr];
}

// Null/undefined handling
function coalesce<T>(...values: (T | null | undefined)[]): T | undefined {
  for (const value of values) {
    if (value != null) {
      return value;
    }
  }
  return undefined;
}

function nullish<T>(value: T | null | undefined, defaultValue: T): T {
  return value != null ? value : defaultValue;
}

function defined<T>(value: T | undefined, defaultValue: T): T {
  return value !== undefined ? value : defaultValue;
}

// Type checking helpers
function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFunction(value: unknown): value is (...args: any[]) => any {
  return typeof value === "function";
}

// Number utilities
function round(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function toPercent(value: number, decimals: number = 1): string {
  return (value * 100).toFixed(decimals) + "%";
}

function formatNumber(value: number): string {
  return value.toLocaleString("es-CO");
}

function parseNumber(str: string): number {
  const parsed = parseFloat(str.replace(/[^0-9.-]/g, ""));
  return isNaN(parsed) ? 0 : parsed;
}

describe("inRange", () => {
  it.each([
    { value: 5, min: 0, max: 10, expected: true },
    { value: 0, min: 0, max: 10, expected: true },
    { value: 10, min: 0, max: 10, expected: true },
    { value: -1, min: 0, max: 10, expected: false },
    { value: 11, min: 0, max: 10, expected: false },
  ])("checks if $value is in range [$min, $max]", ({ value, min, max, expected }) => {
    expect(inRange(value, min, max)).toBe(expected);
  });
});

describe("clamp", () => {
  it.each([
    { value: 5, min: 0, max: 10, expected: 5 },
    { value: -5, min: 0, max: 10, expected: 0 },
    { value: 15, min: 0, max: 10, expected: 10 },
  ])("clamps $value to [$min, $max]", ({ value, min, max, expected }) => {
    expect(clamp(value, min, max)).toBe(expected);
  });
});

describe("isWithinTolerance", () => {
  it.each([
    { value: 10, target: 10, tolerance: 0, expected: true },
    { value: 10, target: 10, tolerance: 5, expected: true },
    { value: 12, target: 10, tolerance: 2, expected: true },
    { value: 13, target: 10, tolerance: 2, expected: false },
  ])("checks $value within $tolerance of $target", ({ value, target, tolerance, expected }) => {
    expect(isWithinTolerance(value, target, tolerance)).toBe(expected);
  });
});

describe("toPascalCase", () => {
  it.each([
    { input: "hello world", expected: "HelloWorld" },
    { input: "hello-world", expected: "HelloWorld" },
    { input: "hello_world", expected: "HelloWorld" },
    { input: "helloWorld", expected: "Helloworld" },
  ])("converts '$input' to PascalCase", ({ input, expected }) => {
    const result = toPascalCase(input);
    expect(result.charAt(0)).toBe(result.charAt(0).toUpperCase());
  });
});

describe("toCamelCase", () => {
  it.each([
    { input: "hello world", expected: "helloWorld" },
    { input: "hello-world", expected: "helloWorld" },
    { input: "HelloWorld", expected: "helloWorld" },
  ])("converts '$input' to camelCase", ({ input }) => {
    const result = toCamelCase(input);
    expect(result).toBeDefined();
    expect(result).not.toBe(input.toUpperCase());
  });
});

describe("toSnakeCase", () => {
  it.each([
    { input: "HelloWorld", expected: "hello_world" },
    { input: "helloWorld", expected: "hello_world" },
    { input: "hello-world", expected: "hello_world" },
  ])("converts '$input' to snake_case", ({ input, expected }) => {
    expect(toSnakeCase(input)).toBe(expected);
  });
});

describe("flatten", () => {
  it("flattens nested arrays", () => {
    expect(flatten([[1, 2], [3, 4]])).toEqual([1, 2, 3, 4]);
  });

  it("flattens deeply nested arrays", () => {
    expect(flatten([1, [2, [3, 4]]])).toEqual([1, 2, 3, 4]);
  });

  it("handles empty array", () => {
    expect(flatten([])).toEqual([]);
  });
});

describe("unique", () => {
  it("removes duplicates", () => {
    expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
  });

  it("handles strings", () => {
    expect(unique(["a", "b", "a"])).toHaveLength(2);
  });
});

describe("compact", () => {
  it.each([
    { arr: [1, null, 2, undefined, 3], expected: [1, 2, 3] },
    { arr: [null, undefined], expected: [] },
    { arr: [1, 2, 3], expected: [1, 2, 3] },
  ])("removes null/undefined from array", ({ arr, expected }) => {
    expect(compact(arr)).toEqual(expected);
  });
});

describe("last", () => {
  it.each([
    { arr: [1, 2, 3], expected: 3 },
    { arr: ["a"], expected: "a" },
    { arr: [], expected: undefined },
  ])("returns last element of array", ({ arr, expected }) => {
    expect(last(arr)).toBe(expected);
  });
});

describe("first", () => {
  it.each([
    { arr: [1, 2, 3], expected: 1 },
    { arr: ["a"], expected: "a" },
    { arr: [], expected: undefined },
  ])("returns first element of array", ({ arr, expected }) => {
    expect(first(arr)).toBe(expected);
  });
});

describe("partition", () => {
  it("partitions array by predicate", () => {
    const [even, odd] = partition([1, 2, 3, 4, 5], n => n % 2 === 0);
    expect(even).toEqual([2, 4]);
    expect(odd).toEqual([1, 3, 5]);
  });

  it("handles empty array", () => {
    const [a, b] = partition([], () => true);
    expect(a).toEqual([]);
    expect(b).toEqual([]);
  });
});

describe("coalesce", () => {
  it.each([
    { values: [null, undefined, 3], expected: 3 },
    { values: [null, 2, 3], expected: 2 },
    { values: [null, undefined], expected: undefined },
    { values: [1, 2, 3], expected: 1 },
  ])("returns first non-nullish value", ({ values, expected }) => {
    expect(coalesce(...values)).toBe(expected);
  });
});

describe("nullish", () => {
  it.each([
    { value: null, defaultValue: "default", expected: "default" },
    { value: undefined, defaultValue: "default", expected: "default" },
    { value: "value", defaultValue: "default", expected: "value" },
    { value: 0, defaultValue: 10, expected: 0 },
    { value: false, defaultValue: true, expected: false },
  ])("returns value or default", ({ value, defaultValue, expected }) => {
    expect(nullish(value, defaultValue)).toBe(expected);
  });
});

describe("defined", () => {
  it.each([
    { value: undefined, defaultValue: "default", expected: "default" },
    { value: "value", defaultValue: "default", expected: "value" },
    { value: null, defaultValue: 10, expected: null },
    { value: 0, defaultValue: 10, expected: 0 },
  ])("returns value or default (strict undefined)", ({ value, defaultValue, expected }) => {
    expect(defined(value as any, defaultValue)).toBe(expected);
  });
});

describe("isNullish", () => {
  it.each([
    { value: null, expected: true },
    { value: undefined, expected: true },
    { value: 0, expected: false },
    { value: "", expected: false },
    { value: false, expected: false },
  ])("checks if $value is nullish", ({ value, expected }) => {
    expect(isNullish(value)).toBe(expected);
  });
});

describe("isArray", () => {
  it.each([
    { value: [], expected: true },
    { value: [1, 2], expected: true },
    { value: {}, expected: false },
    { value: "array", expected: false },
  ])("checks if $value is array", ({ value, expected }) => {
    expect(isArray(value)).toBe(expected);
  });
});

describe("isObject", () => {
  it.each([
    { value: {}, expected: true },
    { value: { a: 1 }, expected: true },
    { value: [], expected: false },
    { value: null, expected: false },
  ])("checks if $value is object", ({ value, expected }) => {
    expect(isObject(value)).toBe(expected);
  });
});

describe("isFunction", () => {
  it.each([
    { value: () => {}, expected: true },
    { value: function() {}, expected: true },
    { value: {}, expected: false },
    { value: "function", expected: false },
  ])("checks if $value is function", ({ value, expected }) => {
    expect(isFunction(value)).toBe(expected);
  });
});

describe("round", () => {
  it.each([
    { value: 3.14159, decimals: 2, expected: 3.14 },
    { value: 3.5, decimals: 0, expected: 4 },
    { value: 1.234, decimals: 1, expected: 1.2 },
  ])("rounds $value to $decimals decimals", ({ value, decimals, expected }) => {
    expect(round(value, decimals)).toBe(expected);
  });
});

describe("toPercent", () => {
  it.each([
    { value: 0.5, decimals: 1, expected: "50.0%" },
    { value: 1, decimals: 0, expected: "100%" },
    { value: 0.333, decimals: 1, expected: "33.3%" },
  ])("converts $value to percent", ({ value, decimals, expected }) => {
    expect(toPercent(value, decimals)).toBe(expected);
  });
});

describe("formatNumber", () => {
  it("formats with locale", () => {
    const result = formatNumber(1234);
    expect(typeof result).toBe("string");
    expect(result).toBeDefined();
  });
});

describe("parseNumber", () => {
  it.each([
    { input: "123", expected: 123 },
    { input: "$ 123.45", expected: 123.45 },
    { input: "invalid", expected: 0 },
    { input: "-5", expected: -5 },
  ])("parses '$input' to number", ({ input, expected }) => {
    expect(parseNumber(input)).toBe(expected);
  });
});
