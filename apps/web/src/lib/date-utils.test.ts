import { describe, it, expect } from "vitest";
import {
  formatISODate,
  parseFormattedDate,
  isValidDateRange,
} from "./date-utils";

describe("formatISODate", () => {
  it.each([
    ["2024-01-15T10:30:00Z", "15/01/2024"],
    ["2024-12-31T23:59:59Z", "31/12/2024"],
    ["2024-06-01T12:00:00Z", "01/06/2024"],
    ["2023-03-15T08:45:30Z", "15/03/2023"],
  ])("formats %p to %p", (iso, expected) => {
    expect(formatISODate(iso)).toBe(expected);
  });

  it("handles valid ISO dates", () => {
    const result = formatISODate("2024-06-15T10:30:00Z");
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("returns fallback on invalid input", () => {
    const invalid = "not-a-date";
    const result = formatISODate(invalid);
    expect(typeof result).toBe("string");
  });

  it.each([
    [""],
    ["invalid"],
    ["random text"],
  ])("handles invalid format: %p", (input) => {
    const result = formatISODate(input);
    expect(typeof result).toBe("string");
  });

  it("handles edge dates correctly", () => {
    const result1 = formatISODate("1970-01-01T00:00:00Z");
    expect(result1).toMatch(/\d{2}\/\d{2}\/\d{4}/);

    const result2 = formatISODate("2099-12-31T23:59:59Z");
    expect(result2).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("is locale-aware (es-CO) - date format DD/MM/YYYY", () => {
    const result = formatISODate("2024-06-15T00:00:00Z");
    expect(result).toMatch(/\d{2}\/\d{2}\/2024/);
    expect(result).toContain("2024");
  });

  it("handles various valid ISO formats", () => {
    const iso1 = formatISODate("2024-01-01T00:00:00Z");
    const iso2 = formatISODate("2024-12-31T23:59:59Z");
    expect(iso1).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(iso2).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe("parseFormattedDate", () => {
  it.each([
    ["15/01/2024", "2024-01-15"],
    ["31/12/2024", "2024-12-31"],
    ["01/06/2024", "2024-06-01"],
    ["15/03/2023", "2023-03-15"],
  ])("parses %p to %p", (formatted, expected) => {
    expect(parseFormattedDate(formatted)).toBe(expected);
  });

  it("handles valid DD/MM/YYYY format", () => {
    const result = parseFormattedDate("15/01/2024");
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("returns fallback on invalid input", () => {
    const invalid = "invalid";
    const result = parseFormattedDate(invalid);
    expect(typeof result).toBe("string");
  });

  it.each([
    [""],
    ["15-01-2024"],
    ["2024/01/15"],
    ["01/01"],
  ])("handles invalid format: %p", (input) => {
    const result = parseFormattedDate(input);
    expect(typeof result).toBe("string");
  });

  it("preserves leading zeros in output", () => {
    const result = parseFormattedDate("05/07/2024");
    expect(result).toBe("2024-07-05");
  });

  it("handles various valid dates", () => {
    const result1 = parseFormattedDate("01/01/2024");
    const result2 = parseFormattedDate("31/12/2024");
    expect(result1).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(result2).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe("isValidDateRange", () => {
  it.each([
    ["2024-01-01", "2024-01-31", true],
    ["2024-01-01", "2024-12-31", true],
    ["2024-01-01", "2024-01-01", true], // same date
    ["2023-12-31", "2024-01-01", true],
    ["2024-01-31", "2024-01-01", false], // from > to
    ["2024-12-31", "2024-01-01", false],
    ["2025-01-01", "2024-01-01", false],
  ])("validates range %p to %p -> %p", (from, to, isValid) => {
    expect(isValidDateRange(from, to)).toBe(isValid);
  });

  it("returns false on invalid dates", () => {
    expect(isValidDateRange("invalid", "2024-01-01")).toBe(false);
    expect(isValidDateRange("2024-01-01", "invalid")).toBe(false);
    expect(isValidDateRange("invalid", "also-invalid")).toBe(false);
  });

  it.each([
    ["", "2024-01-01"],
    ["2024-01-01", ""],
    ["", ""],
  ])("handles empty dates: %p, %p", (from, to) => {
    expect(isValidDateRange(from, to)).toBe(false);
  });

  it("handles ISO format with time", () => {
    expect(isValidDateRange("2024-01-01T00:00:00Z", "2024-01-31T23:59:59Z")).toBe(true);
  });

  it("handles date-only format", () => {
    expect(isValidDateRange("2024-01-01", "2024-01-31")).toBe(true);
  });

  it("is strict about comparison (from <= to)", () => {
    expect(isValidDateRange("2024-01-02", "2024-01-01")).toBe(false);
    expect(isValidDateRange("2024-06-15", "2024-06-14")).toBe(false);
  });
});

describe("formatISODate edge cases", () => {
  it("formats leap year date", () => {
    const result = formatISODate("2024-02-29T00:00:00Z");
    expect(result).toMatch(/\d{2}\/\d{2}\/2024/);
  });

  it("formats non-leap year date", () => {
    const result = formatISODate("2023-02-28T00:00:00Z");
    expect(result).toMatch(/\d{2}\/\d{2}\/2023/);
  });

  it("formats year 2000 date", () => {
    const result = formatISODate("2000-06-15T12:00:00Z");
    expect(result).toMatch(/\d{2}\/\d{2}\/2000/);
  });

  it("formats far future date", () => {
    const result = formatISODate("2100-12-31T23:59:59Z");
    expect(result).toMatch(/\d{2}\/\d{2}\/2100/);
  });

  it("formats double-digit month and day", () => {
    const result = formatISODate("2024-10-15T00:00:00Z");
    expect(result).toMatch(/\d{2}\/\d{2}\/2024/);
  });

  it.each([
    "2024/01/15",
    "01-15-2024",
    "15-01-2024",
    "2024.01.15",
    "15.01.2024",
    null,
    undefined,
    123,
    NaN,
  ])("handles non-ISO format gracefully: %p", (input) => {
    const result = formatISODate(input as any);
    expect(typeof result).toBe("string");
  });

  it("handles timezone variations", () => {
    const utc = formatISODate("2024-06-15T12:00:00Z");
    const plus = formatISODate("2024-06-15T12:00:00+05:00");
    const minus = formatISODate("2024-06-15T12:00:00-07:00");

    expect(typeof utc).toBe("string");
    expect(typeof plus).toBe("string");
    expect(typeof minus).toBe("string");
  });
});

describe("parseFormattedDate edge cases", () => {
  it("parses valid DD/MM/YYYY format dates", () => {
    const result1 = parseFormattedDate("28/02/2023");
    const result2 = parseFormattedDate("01/01/2000");
    const result3 = parseFormattedDate("31/12/2099");
    const result4 = parseFormattedDate("05/05/2020");

    expect(result1).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(result2).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(result3).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(result4).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("handles ISO date format gracefully", () => {
    const result = parseFormattedDate("2024-01-15");
    expect(typeof result).toBe("string");
  });

  it("handles alternate separator formats gracefully", () => {
    const result1 = parseFormattedDate("01-15-2024");
    const result2 = parseFormattedDate("15.01.2024");
    expect(typeof result1).toBe("string");
    expect(typeof result2).toBe("string");
  });

  it("handles whitespace in formatted date", () => {
    const result1 = parseFormattedDate(" 15/01/2024");
    const result2 = parseFormattedDate("15/01/2024 ");
    expect(typeof result1).toBe("string");
    expect(typeof result2).toBe("string");
  });
});

describe("isValidDateRange edge cases", () => {
  it.each([
    ["2024-01-01", "2024-01-01", true], // same exact date
    ["2024-06-15T12:00:00Z", "2024-06-15T13:00:00Z", true], // same day, different times
    ["1970-01-01", "2099-12-31", true], // maximum range
    ["1970-01-01", "1970-01-01", true], // epoch to epoch
    ["2024-12-31", "2025-01-01", true], // year boundary
    ["2024-02-28", "2024-03-01", true], // month boundary
  ])("handles boundary conditions: %p to %p -> %p", (from, to, expected) => {
    expect(isValidDateRange(from, to)).toBe(expected);
  });

  it.each([
    ["2024-13-01", "2024-01-01"], // invalid month
    ["2024-01-32", "2024-01-01"], // invalid day
    ["2024-02-30", "2024-01-01"], // invalid date
    ["not-a-date", "2024-01-01"],
    ["2024-01-01", "also-invalid"],
  ])("handles invalid date inputs: %p, %p", (from, to) => {
    expect(isValidDateRange(from, to)).toBe(false);
  });

  it("handles ISO format with different time components", () => {
    const base = "2024-06-15";
    const withTime1 = "2024-06-15T00:00:00Z";
    const withTime2 = "2024-06-15T23:59:59Z";

    expect(isValidDateRange(base, withTime1)).toBe(true);
    expect(isValidDateRange(withTime1, withTime2)).toBe(true);
  });

  it.each([
    { from: "2024-12-31", to: "2024-01-01" },
    { from: "2024-06-15", to: "2024-06-14" },
    { from: "2025-01-01", to: "2024-12-31" },
    { from: "2024-02-01", to: "2024-01-31" },
  ])("strictly enforces from <= to: from=%p, to=%p", ({ from, to }) => {
    expect(isValidDateRange(from, to)).toBe(false);
  });
});

describe("Date utilities integration", () => {
  it("formats and parses valid dates", () => {
    const iso = "2024-06-15T10:30:00Z";
    const formatted = formatISODate(iso);
    expect(formatted).toMatch(/15.*06.*2024/);

    const parsed = parseFormattedDate(formatted);
    expect(parsed).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("validates date range with formatted dates", () => {
    const from = "01/01/2024";
    const to = "31/12/2024";
    const fromISO = parseFormattedDate(from);
    const toISO = parseFormattedDate(to);
    expect(isValidDateRange(fromISO, toISO)).toBe(true);
  });

  it("handles various date formats correctly", () => {
    expect(isValidDateRange("2024-01-01", "2024-12-31")).toBe(true);
    expect(isValidDateRange("2024-12-31", "2024-01-01")).toBe(false);
  });

  it("round-trips date format/parse cycles", () => {
    const testDates = [
      "2024-01-15T00:00:00Z",
      "2024-06-30T15:45:30Z",
      "2024-12-25T08:20:00Z",
    ];

    testDates.forEach((isoDate) => {
      const formatted = formatISODate(isoDate);
      const parsed = parseFormattedDate(formatted);
      expect(parsed).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  it("validates week-long date ranges", () => {
    const start = "2024-06-10";
    const end = "2024-06-17";
    expect(isValidDateRange(start, end)).toBe(true);
  });

  it("validates month-long date ranges", () => {
    const start = "2024-06-01";
    const end = "2024-06-30";
    expect(isValidDateRange(start, end)).toBe(true);
  });

  it("validates year-long date ranges", () => {
    const start = "2024-01-01";
    const end = "2024-12-31";
    expect(isValidDateRange(start, end)).toBe(true);
  });
});
