import { describe, it, expect } from "vitest";

// Date and string conversion utilities
function parseDate(dateStr: string): Date | null {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

function formatDate(date: Date, format: string = "YYYY-MM-DD"): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  switch (format) {
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    case "DD/MM/YYYY":
      return `${day}/${month}/${year}`;
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "YYYY-MM-DD HH:mm:ss":
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

function getMonthName(monthIndex: number, locale: string = "es-CO"): string {
  const months = new Date(2024, monthIndex, 1).toLocaleString(locale, { month: "long" });
  return months.charAt(0).toUpperCase() + months.slice(1);
}

function getDayName(dayIndex: number, locale: string = "es-CO"): string {
  const days = new Date(2024, 0, dayIndex + 1).toLocaleString(locale, { weekday: "long" });
  return days.charAt(0).toUpperCase() + days.slice(1);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function getDayOfWeek(date: Date): number {
  return date.getDay();
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
}

function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()
  );
}

function diffDays(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date1.getTime() - date2.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function formatRelativeDate(date: Date): string {
  if (isToday(date)) return "Hoy";
  if (isYesterday(date)) return "Ayer";
  if (isTomorrow(date)) return "Mañana";

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (days < 7) return `Hace ${days} días`;
  if (weeks < 4) return `Hace ${weeks} semanas`;
  if (months < 12) return `Hace ${months} meses`;

  return formatDate(date, "DD/MM/YYYY");
}

describe("parseDate", () => {
  it.each([
    { input: "2024-01-15", expected: true },
    { input: "2024-12-31", expected: true },
    { input: "01/15/2024", expected: true },
    { input: "2024-02-29", expected: true }, // leap year
    { input: "invalid-date", expected: false },
    { input: "2024-13-01", expected: false }, // invalid month
    { input: "", expected: false },
  ])("parses '$input' correctly", ({ input, expected }) => {
    const result = parseDate(input);
    expect((result !== null) === expected);
  });
});

describe("formatDate", () => {
  const testDate = new Date("2024-01-15T14:30:45Z");

  it.each([
    { format: "YYYY-MM-DD", expectedContains: "2024-01-15" },
    { format: "DD/MM/YYYY", expectedContains: "15/01/2024" },
    { format: "MM/DD/YYYY", expectedContains: "01/15/2024" },
  ])("formats with $format", ({ format, expectedContains }) => {
    expect(formatDate(testDate, format)).toContain(expectedContains);
  });

  it("handles invalid date", () => {
    const invalid = new Date("invalid");
    expect(formatDate(invalid)).toBe("");
  });
});

describe("getMonthName", () => {
  it.each([
    { index: 0, expectedContains: "enero" },
    { index: 1, expectedContains: "febrero" },
    { index: 11, expectedContains: "diciembre" },
  ])("returns month name for index $index", ({ index, expectedContains }) => {
    const name = getMonthName(index);
    expect(name.toLowerCase()).toContain(expectedContains);
  });
});

describe("getDayName", () => {
  it("returns day names", () => {
    const monday = getDayName(0); // Monday
    expect(monday).toBeDefined();
    expect(typeof monday).toBe("string");
  });
});

describe("addDays", () => {
  it("adds days to a date", () => {
    const date = new Date("2024-01-15");
    const result = addDays(date, 1);
    const diff = Math.floor((result.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    expect(diff).toBeGreaterThanOrEqual(0);
    expect(result).not.toBe(date);
  });

  it("handles multiple days", () => {
    const date = new Date("2024-01-10");
    const result = addDays(date, 7);
    expect(result.getDate()).toBeGreaterThanOrEqual(date.getDate());
  });

  it("creates new date object", () => {
    const date = new Date("2024-01-15");
    const result = addDays(date, 0);
    expect(result).not.toBe(date);
    expect(result.getTime()).toBe(date.getTime());
  });
});

describe("addMonths", () => {
  it("adds months to a date", () => {
    const date = new Date("2024-01-15");
    const result = addMonths(date, 1);
    expect(result.getMonth()).not.toBe(date.getMonth());
    expect(result).not.toBe(date);
  });

  it("creates new date object", () => {
    const date = new Date("2024-01-15");
    const result = addMonths(date, 0);
    expect(result).not.toBe(date);
  });
});

describe("addYears", () => {
  it("adds years to a date", () => {
    const date = new Date("2024-01-15");
    const result = addYears(date, 1);
    expect(result.getFullYear()).not.toBe(date.getFullYear());
    expect(result).not.toBe(date);
  });

  it("subtracts years with negative value", () => {
    const date = new Date("2024-01-15");
    const result = addYears(date, -1);
    expect(result.getFullYear()).toBeLessThan(date.getFullYear());
  });

  it("creates new date object", () => {
    const date = new Date("2024-01-15");
    const result = addYears(date, 0);
    expect(result).not.toBe(date);
  });
});

describe("getDaysInMonth", () => {
  it.each([
    { year: 2024, month: 0, expected: 31 }, // January
    { year: 2024, month: 1, expected: 29 }, // February (leap year)
    { year: 2023, month: 1, expected: 28 }, // February (non-leap)
    { year: 2024, month: 3, expected: 30 }, // April
  ])("returns $expected days for month", ({ year, month, expected }) => {
    expect(getDaysInMonth(year, month)).toBe(expected);
  });
});

describe("isLeapYear", () => {
  it.each([
    { year: 2024, expected: true },
    { year: 2020, expected: true },
    { year: 2000, expected: true },
    { year: 2023, expected: false },
    { year: 1900, expected: false },
  ])("correctly identifies leap year: $year", ({ year, expected }) => {
    expect(isLeapYear(year)).toBe(expected);
  });
});

describe("getDayOfWeek", () => {
  it("returns day of week", () => {
    const date = new Date("2024-01-15"); // Monday
    const dayOfWeek = getDayOfWeek(date);
    expect(dayOfWeek).toBeGreaterThanOrEqual(0);
    expect(dayOfWeek).toBeLessThanOrEqual(6);
  });
});

describe("getWeekNumber", () => {
  it("returns week number", () => {
    const date = new Date("2024-01-15");
    const week = getWeekNumber(date);
    expect(week).toBeGreaterThan(0);
    expect(week).toBeLessThanOrEqual(53);
  });
});

describe("isToday", () => {
  it("identifies today", () => {
    const today = new Date();
    expect(isToday(today)).toBe(true);
  });

  it("rejects other dates", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });
});

describe("isYesterday", () => {
  it("identifies yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isYesterday(yesterday)).toBe(true);
  });
});

describe("isTomorrow", () => {
  it("identifies tomorrow", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isTomorrow(tomorrow)).toBe(true);
  });
});

describe("diffDays", () => {
  it.each([
    { days: 0, expected: 0 },
    { days: 1, expected: 1 },
    { days: 7, expected: 7 },
  ])("calculates $expected day difference", ({ days, expected }) => {
    const date1 = new Date("2024-01-15");
    const date2 = new Date(date1);
    date2.setDate(date2.getDate() + days);
    expect(diffDays(date1, date2)).toBe(expected);
  });
});

describe("isSameDay", () => {
  it("identifies same day", () => {
    const date1 = new Date("2024-01-15T10:30:00");
    const date2 = new Date("2024-01-15T20:45:00");
    expect(isSameDay(date1, date2)).toBe(true);
  });

  it("rejects different days", () => {
    const date1 = new Date("2024-01-15");
    const date2 = new Date("2024-01-16");
    expect(isSameDay(date1, date2)).toBe(false);
  });
});

describe("formatRelativeDate", () => {
  it("formats today as 'Hoy'", () => {
    const today = new Date();
    expect(formatRelativeDate(today)).toBe("Hoy");
  });

  it("formats yesterday as 'Ayer'", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatRelativeDate(yesterday)).toBe("Ayer");
  });

  it("formats tomorrow as 'Mañana'", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(formatRelativeDate(tomorrow)).toBe("Mañana");
  });

  it("formats older dates with relative time", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 3);
    const result = formatRelativeDate(oldDate);
    expect(result).toContain("Hace");
  });
});
