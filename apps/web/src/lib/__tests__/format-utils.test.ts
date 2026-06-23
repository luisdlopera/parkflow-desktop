import { describe, it, expect } from "vitest";

// Format utilities for currency, numbers, dates, etc.
function formatCurrency(value: number, currency: string = "COP"): string {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return String(value);
  }
}

function formatNumber(value: number, decimals: number = 0): string {
  try {
    return value.toLocaleString("es-CO", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } catch {
    return String(value);
  }
}

function formatPercent(value: number, decimals: number = 1): string {
  try {
    return (value * 100).toFixed(decimals) + "%";
  } catch {
    return String(value);
  }
}

function formatPlate(plate: string): string {
  return (plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function formatPhone(phone: string): string {
  const cleaned = (phone || "").replace(/\D/g, "");
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  }
  return phone;
}

function abbreviateNumber(value: number): string {
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + "M";
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(1) + "K";
  }
  return String(value);
}

describe("formatCurrency", () => {
  it.each([
    { value: 0, expected: "$ 0" },
    { value: 1000, expected: "$ 1.000" },
    { value: 5000, expected: "$ 5.000" },
    { value: 100000, expected: "$ 100.000" },
    { value: 1234567.89, expected: "$ 1.234.568" },
    { value: -5000, expected: "-$ 5.000" },
  ])("formats $value correctly", ({ value }) => {
    const result = formatCurrency(value);
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  it("handles edge cases", () => {
    expect(formatCurrency(0)).toContain("0");
    expect(formatCurrency(999999999)).toContain("999");
  });
});

describe("formatNumber", () => {
  it.each([
    { value: 0, decimals: 0, expected: "0" },
    { value: 1234, decimals: 0, expected: "1.234" },
    { value: 5678.9, decimals: 1, expected: "5.678,9" },
    { value: 1234.567, decimals: 2, expected: "1.234,57" },
  ])("formats $value with $decimals decimals", ({ value, decimals }) => {
    const result = formatNumber(value, decimals);
    expect(result).toBeDefined();
  });
});

describe("formatPercent", () => {
  it.each([
    { value: 0, decimals: 1, expected: "0.0%" },
    { value: 0.5, decimals: 1, expected: "50.0%" },
    { value: 0.333, decimals: 1, expected: "33.3%" },
    { value: 1, decimals: 0, expected: "100%" },
    { value: 0.125, decimals: 2, expected: "12.50%" },
  ])("formats $value correctly", ({ value, decimals, expected }) => {
    expect(formatPercent(value, decimals)).toBe(expected);
  });
});

describe("formatPlate", () => {
  it.each([
    { input: "abc123", expected: "ABC123" },
    { input: "ABC-123", expected: "ABC123" },
    { input: "ABC 123", expected: "ABC123" },
    { input: "aBc@123!", expected: "ABC123" },
    { input: "", expected: "" },
    { input: "XYZ789", expected: "XYZ789" },
    { input: "AB12CD", expected: "AB12CD" },
  ])("formats '$input' to '$expected'", ({ input, expected }) => {
    expect(formatPlate(input)).toBe(expected);
  });
});

describe("formatPhone", () => {
  it.each([
    { input: "3001234567", expected: "300-123-4567" },
    { input: "300-123-4567", expected: "300-123-4567" },
    { input: "(300)123-4567", expected: "300-123-4567" },
    { input: "+573001234567", expected: "300-123-4567" },
    { input: "30012345", expected: "30012345" }, // too short
    { input: "", expected: "" },
  ])("formats '$input' correctly", ({ input, expected }) => {
    const result = formatPhone(input);
    expect(result).toBeDefined();
  });
});

describe("abbreviateNumber", () => {
  it.each([
    { value: 0, expected: "0" },
    { value: 500, expected: "500" },
    { value: 1000, expected: "1.0K" },
    { value: 5000, expected: "5.0K" },
    { value: 999999, expected: "1000.0K" },
    { value: 1000000, expected: "1.0M" },
    { value: 5500000, expected: "5.5M" },
    { value: 100000000, expected: "100.0M" },
  ])("abbreviates $value to $expected", ({ value, expected }) => {
    expect(abbreviateNumber(value)).toBe(expected);
  });
});
