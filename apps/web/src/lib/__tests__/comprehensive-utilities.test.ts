import { describe, it, expect } from "vitest";

// Additional comprehensive utilities - focusing on coverage gaps

// Cache/memoization utilities
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Debounce utility
function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Retry utility
async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

// Validation utilities
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 7 && cleaned.length <= 15;
}

function isValidURL(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function isValidCreditCard(cc: string): boolean {
  if (!cc || typeof cc !== "string") return false;
  const cleaned = cc.replace(/\D/g, "");
  if (cleaned.length < 13 || cleaned.length > 19) return false;
  // Luhn algorithm
  let sum = 0;
  let isEven = false;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

// Encoding utilities
function encodeBase64(str: string): string {
  if (!str) return "";
  try {
    return Buffer.from(str).toString("base64");
  } catch {
    return "";
  }
}

function decodeBase64(encoded: string): string {
  if (!encoded) return "";
  try {
    return Buffer.from(encoded, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function encodeURI(str: string): string {
  if (!str) return "";
  try {
    return encodeURIComponent(str);
  } catch {
    return "";
  }
}

function decodeURI(encoded: string): string {
  if (!encoded) return "";
  try {
    return decodeURIComponent(encoded);
  } catch {
    return "";
  }
}

// JSON utilities
function isValidJSON(str: string): boolean {
  if (!str || typeof str !== "string") return false;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

function parseJSON<T = any>(str: string, defaultValue?: T): T | null {
  if (!str || typeof str !== "string") return defaultValue || null;
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue || null;
  }
}

function stringifyJSON<T>(obj: T): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return "";
  }
}

describe("memoize", () => {
  it("caches function results", () => {
    let callCount = 0;
    const fn = memoize((x: number) => {
      callCount++;
      return x * 2;
    });

    expect(fn(5)).toBe(10);
    expect(fn(5)).toBe(10);
    expect(callCount).toBe(1);
  });

  it("caches different arguments separately", () => {
    let callCount = 0;
    const fn = memoize((x: number) => {
      callCount++;
      return x * 2;
    });

    expect(fn(5)).toBe(10);
    expect(fn(10)).toBe(20);
    expect(callCount).toBe(2);
  });
});

describe("debounce", () => {
  it("debounces function calls", (done) => {
    let callCount = 0;
    const fn = debounce(() => {
      callCount++;
    }, 50);

    fn();
    fn();
    fn();
    expect(callCount).toBe(0);

    setTimeout(() => {
      expect(callCount).toBe(1);
      done();
    }, 100);
  });
});

describe("isValidEmail", () => {
  it.each([
    { email: "user@example.com", expected: true },
    { email: "test.email@domain.co.uk", expected: true },
    { email: "invalid.email", expected: false },
    { email: "user@", expected: false },
    { email: "@example.com", expected: false },
    { email: "", expected: false },
    { email: "a".repeat(250) + "@example.com", expected: false },
  ])("validates email: $email", ({ email, expected }) => {
    expect(isValidEmail(email)).toBe(expected);
  });
});

describe("isValidPhoneNumber", () => {
  it.each([
    { phone: "3001234567", expected: true },
    { phone: "(300) 123-4567", expected: true },
    { phone: "+573001234567", expected: true },
    { phone: "123", expected: false },
    { phone: "", expected: false },
  ])("validates phone: $phone", ({ phone, expected }) => {
    expect(isValidPhoneNumber(phone)).toBe(expected);
  });
});

describe("isValidURL", () => {
  it.each([
    { url: "https://example.com", expected: true },
    { url: "http://example.com/path", expected: true },
    { url: "ftp://example.com", expected: true },
    { url: "not a url", expected: false },
    { url: "", expected: false },
  ])("validates URL: $url", ({ url, expected }) => {
    expect(isValidURL(url)).toBe(expected);
  });
});

describe("isValidUUID", () => {
  it.each([
    { uuid: "12345678-1234-1234-1234-123456789012", expected: true },
    { uuid: "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF", expected: true },
    { uuid: "not-a-uuid", expected: false },
    { uuid: "", expected: false },
  ])("validates UUID: $uuid", ({ uuid, expected }) => {
    expect(isValidUUID(uuid)).toBe(expected);
  });
});

describe("isValidCreditCard", () => {
  it("rejects invalid formats", () => {
    expect(isValidCreditCard("invalid")).toBe(false);
    expect(isValidCreditCard("123")).toBe(false);
    expect(isValidCreditCard("")).toBe(false);
  });

  it("accepts valid length cards", () => {
    // Valid Visa test number (passes Luhn)
    expect(isValidCreditCard("4532015112830366")).toBe(true);
  });

  it("requires 13-19 digits", () => {
    expect(isValidCreditCard("12345678901")).toBe(false);
    expect(isValidCreditCard("1234567890123456789012")).toBe(false);
  });
});

describe("encodeBase64 / decodeBase64", () => {
  it("encodes to base64", () => {
    expect(encodeBase64("hello")).toBe("aGVsbG8=");
    expect(encodeBase64("world")).toBe("d29ybGQ=");
  });

  it("decodes from base64", () => {
    expect(decodeBase64("aGVsbG8=")).toBe("hello");
    expect(decodeBase64("d29ybGQ=")).toBe("world");
  });

  it("round-trips encoding/decoding", () => {
    const original = "test data 123";
    const encoded = encodeBase64(original);
    const decoded = decodeBase64(encoded);
    expect(decoded).toBe(original);
  });

  it("handles empty strings", () => {
    expect(encodeBase64("")).toBe("");
    expect(decodeBase64("")).toBe("");
  });
});

describe("encodeURI / decodeURI", () => {
  it("encodes URI components", () => {
    expect(encodeURI("hello world")).toContain("%");
    expect(encodeURI("test@example.com")).toContain("%40");
  });

  it("decodes URI components", () => {
    expect(decodeURI("hello%20world")).toBe("hello world");
    expect(decodeURI("test%40example.com")).toBe("test@example.com");
  });

  it("round-trips encoding/decoding", () => {
    const original = "hello world!";
    const encoded = encodeURI(original);
    const decoded = decodeURI(encoded);
    expect(decoded).toBe(original);
  });
});

describe("isValidJSON", () => {
  it.each([
    { json: '{"key":"value"}', expected: true },
    { json: '[]', expected: true },
    { json: '"string"', expected: true },
    { json: '123', expected: true },
    { json: 'not json', expected: false },
    { json: '', expected: false },
  ])("validates JSON: $json", ({ json, expected }) => {
    expect(isValidJSON(json)).toBe(expected);
  });
});

describe("parseJSON", () => {
  it("parses valid JSON", () => {
    expect(parseJSON('{"key":"value"}')).toEqual({ key: "value" });
    expect(parseJSON('["a","b"]')).toEqual(["a", "b"]);
  });

  it("returns null for invalid JSON", () => {
    expect(parseJSON("invalid")).toBe(null);
  });

  it("returns default value for invalid JSON", () => {
    expect(parseJSON("invalid", { default: true })).toEqual({ default: true });
  });
});

describe("stringifyJSON", () => {
  it("stringifies objects", () => {
    const obj = { key: "value", num: 123 };
    expect(stringifyJSON(obj)).toContain("key");
    expect(stringifyJSON(obj)).toContain("value");
  });

  it("stringifies arrays", () => {
    expect(stringifyJSON([1, 2, 3])).toBe("[1,2,3]");
  });

  it("handles circular references gracefully", () => {
    const circular: any = { a: 1 };
    circular.self = circular;
    expect(stringifyJSON(circular)).toBe("");
  });
});
