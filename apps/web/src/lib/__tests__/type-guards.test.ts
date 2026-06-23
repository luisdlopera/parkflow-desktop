import { describe, it, expect } from "vitest";

// Type guards and utilities
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

function isNull(value: unknown): value is null {
  return value === null;
}

function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

function isEmpty(value: unknown): boolean {
  if (isNullish(value)) return true;
  if (isString(value)) return value.length === 0;
  if (isArray(value)) return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  return false;
}

function isEmail(value: unknown): value is string {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

function isURL(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isUUID(value: unknown): value is string {
  if (!isString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function isInteger(value: unknown): boolean {
  return isNumber(value) && Number.isInteger(value);
}

function isPositive(value: unknown): boolean {
  return isNumber(value) && value > 0;
}

function isNegative(value: unknown): boolean {
  return isNumber(value) && value < 0;
}

function isNonNegative(value: unknown): boolean {
  return isNumber(value) && value >= 0;
}

function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

function isValidDate(value: unknown): value is Date {
  return isDate(value) && !isNaN(value.getTime());
}

function hasProperty<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) return false;
  return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
}

describe("isString", () => {
  it.each([
    { value: "hello", expected: true },
    { value: "", expected: true },
    { value: 123, expected: false },
    { value: null, expected: false },
    { value: undefined, expected: false },
  ])("correctly identifies string: $value", ({ value, expected }) => {
    expect(isString(value)).toBe(expected);
  });
});

describe("isNumber", () => {
  it.each([
    { value: 123, expected: true },
    { value: 0, expected: true },
    { value: -456, expected: true },
    { value: 3.14, expected: true },
    { value: NaN, expected: false },
    { value: "123", expected: false },
  ])("correctly identifies number: $value", ({ value, expected }) => {
    expect(isNumber(value)).toBe(expected);
  });
});

describe("isBoolean", () => {
  it.each([
    { value: true, expected: true },
    { value: false, expected: true },
    { value: 1, expected: false },
    { value: "true", expected: false },
  ])("correctly identifies boolean: $value", ({ value, expected }) => {
    expect(isBoolean(value)).toBe(expected);
  });
});

describe("isObject", () => {
  it.each([
    { value: {}, expected: true },
    { value: { a: 1 }, expected: true },
    { value: [], expected: false },
    { value: null, expected: false },
    { value: "string", expected: false },
  ])("correctly identifies object: $value", ({ value, expected }) => {
    expect(isObject(value)).toBe(expected);
  });
});

describe("isArray", () => {
  it.each([
    { value: [], expected: true },
    { value: [1, 2, 3], expected: true },
    { value: {}, expected: false },
    { value: "array", expected: false },
    { value: null, expected: false },
  ])("correctly identifies array: $value", ({ value, expected }) => {
    expect(isArray(value)).toBe(expected);
  });
});

describe("isNull", () => {
  it.each([
    { value: null, expected: true },
    { value: undefined, expected: false },
    { value: 0, expected: false },
    { value: "", expected: false },
  ])("correctly identifies null: $value", ({ value, expected }) => {
    expect(isNull(value)).toBe(expected);
  });
});

describe("isUndefined", () => {
  it.each([
    { value: undefined, expected: true },
    { value: null, expected: false },
    { value: 0, expected: false },
  ])("correctly identifies undefined: $value", ({ value, expected }) => {
    expect(isUndefined(value)).toBe(expected);
  });
});

describe("isNullish", () => {
  it.each([
    { value: null, expected: true },
    { value: undefined, expected: true },
    { value: 0, expected: false },
    { value: "", expected: false },
    { value: false, expected: false },
  ])("correctly identifies nullish: $value", ({ value, expected }) => {
    expect(isNullish(value)).toBe(expected);
  });
});

describe("isDefined", () => {
  it.each([
    { value: 0, expected: true },
    { value: "", expected: true },
    { value: false, expected: true },
    { value: null, expected: false },
    { value: undefined, expected: false },
  ])("correctly identifies defined: $value", ({ value, expected }) => {
    expect(isDefined(value)).toBe(expected);
  });
});

describe("isEmpty", () => {
  it.each([
    { value: null, expected: true },
    { value: undefined, expected: true },
    { value: "", expected: true },
    { value: [], expected: true },
    { value: {}, expected: true },
    { value: "hello", expected: false },
    { value: [1], expected: false },
    { value: { a: 1 }, expected: false },
    { value: 0, expected: false },
  ])("correctly identifies empty: $value", ({ value, expected }) => {
    expect(isEmpty(value)).toBe(expected);
  });
});

describe("isEmail", () => {
  it.each([
    { value: "user@example.com", expected: true },
    { value: "test.email@domain.co.uk", expected: true },
    { value: "invalid.email", expected: false },
    { value: "user@", expected: false },
    { value: "@example.com", expected: false },
    { value: 123, expected: false },
  ])("correctly identifies email: $value", ({ value, expected }) => {
    expect(isEmail(value)).toBe(expected);
  });
});

describe("isURL", () => {
  it.each([
    { value: "https://example.com", expected: true },
    { value: "http://example.com/path", expected: true },
    { value: "ftp://example.com", expected: true },
    { value: "not a url", expected: false },
    { value: "example.com", expected: false },
    { value: 123, expected: false },
  ])("correctly identifies URL: $value", ({ value, expected }) => {
    expect(isURL(value)).toBe(expected);
  });
});

describe("isUUID", () => {
  it.each([
    { value: "12345678-1234-1234-1234-123456789012", expected: true },
    { value: "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF", expected: true },
    { value: "12345678-1234-1234-1234-12345678901", expected: false },
    { value: "not-a-uuid", expected: false },
    { value: 123, expected: false },
  ])("correctly identifies UUID: $value", ({ value, expected }) => {
    expect(isUUID(value)).toBe(expected);
  });
});

describe("isInteger", () => {
  it.each([
    { value: 123, expected: true },
    { value: 0, expected: true },
    { value: -456, expected: true },
    { value: 3.14, expected: false },
    { value: "123", expected: false },
  ])("correctly identifies integer: $value", ({ value, expected }) => {
    expect(isInteger(value)).toBe(expected);
  });
});

describe("isPositive", () => {
  it.each([
    { value: 1, expected: true },
    { value: 100, expected: true },
    { value: 0.1, expected: true },
    { value: 0, expected: false },
    { value: -1, expected: false },
  ])("correctly identifies positive: $value", ({ value, expected }) => {
    expect(isPositive(value)).toBe(expected);
  });
});

describe("isNegative", () => {
  it.each([
    { value: -1, expected: true },
    { value: -100, expected: true },
    { value: 0, expected: false },
    { value: 1, expected: false },
  ])("correctly identifies negative: $value", ({ value, expected }) => {
    expect(isNegative(value)).toBe(expected);
  });
});

describe("isNonNegative", () => {
  it.each([
    { value: 0, expected: true },
    { value: 1, expected: true },
    { value: 100, expected: true },
    { value: -1, expected: false },
  ])("correctly identifies non-negative: $value", ({ value, expected }) => {
    expect(isNonNegative(value)).toBe(expected);
  });
});

describe("isDate", () => {
  it.each([
    { value: new Date(), expected: true },
    { value: new Date("2024-01-01"), expected: true },
    { value: new Date("invalid"), expected: false },
    { value: "2024-01-01", expected: false },
    { value: null, expected: false },
  ])("correctly identifies date: $value", ({ value, expected }) => {
    expect(isDate(value)).toBe(expected);
  });
});

describe("isValidDate", () => {
  it.each([
    { value: new Date(), expected: true },
    { value: new Date("2024-01-01"), expected: true },
    { value: new Date("invalid"), expected: false },
  ])("correctly identifies valid date: $value", ({ value, expected }) => {
    expect(isValidDate(value)).toBe(expected);
  });
});

describe("hasProperty", () => {
  it("checks for property existence", () => {
    const obj = { a: 1, b: 2 };
    expect(hasProperty(obj, "a")).toBe(true);
    expect(hasProperty(obj, "c")).toBe(false);
  });

  it("ignores prototype properties", () => {
    const obj = Object.create({ inherited: 1 });
    obj.own = 2;
    expect(hasProperty(obj, "own")).toBe(true);
    expect(hasProperty(obj, "inherited")).toBe(false);
  });
});

describe("isPlainObject", () => {
  it.each([
    { value: {}, expected: true },
    { value: { a: 1 }, expected: true },
    { value: Object.create(null), expected: true },
    { value: [], expected: false },
    { value: new Date(), expected: false },
    { value: "string", expected: false },
  ])("correctly identifies plain object: $value", ({ value, expected }) => {
    expect(isPlainObject(value)).toBe(expected);
  });
});
