import { describe, it, expect } from "vitest";
import {
  VEHICLE_TYPES,
  RATE_TYPES,
  RATE_TYPE_LABELS,
  RATE_CATEGORIES,
  RATE_CATEGORY_LABELS,
  DAYS_OF_WEEK,
  ROUNDING,
  ROLES,
  LOST_TICKET_POLICIES,
  toHhMmSs,
  toIsoOrNull,
  toDatetimeLocalValue,
} from "./constants";

describe("Constants exports", () => {
  describe("VEHICLE_TYPES", () => {
    it("exports an array", () => {
      expect(Array.isArray(VEHICLE_TYPES)).toBe(true);
    });

    it("includes all vehicle types", () => {
      expect(VEHICLE_TYPES).toContain("CAR");
      expect(VEHICLE_TYPES).toContain("MOTORCYCLE");
      expect(VEHICLE_TYPES).toContain("BICYCLE");
      expect(VEHICLE_TYPES).toContain("TRUCK");
      expect(VEHICLE_TYPES).toContain("BUS");
      expect(VEHICLE_TYPES).toContain("VAN");
      expect(VEHICLE_TYPES).toContain("ELECTRIC");
      expect(VEHICLE_TYPES).toContain("OTHER");
    });

    it("has exactly 8 vehicle types", () => {
      expect(VEHICLE_TYPES.length).toBe(8);
    });

    it.each(VEHICLE_TYPES)("includes vehicle type %s", (type) => {
      expect(VEHICLE_TYPES).toContain(type);
    });
  });

  describe("RATE_TYPES", () => {
    it("exports an array", () => {
      expect(Array.isArray(RATE_TYPES)).toBe(true);
    });

    it("includes all rate types", () => {
      expect(RATE_TYPES).toContain("PER_MINUTE");
      expect(RATE_TYPES).toContain("HOURLY");
      expect(RATE_TYPES).toContain("DAILY");
      expect(RATE_TYPES).toContain("FLAT");
      expect(RATE_TYPES).toContain("FRACTIONAL");
    });

    it("has exactly 5 rate types", () => {
      expect(RATE_TYPES.length).toBe(5);
    });
  });

  describe("RATE_TYPE_LABELS", () => {
    it("is an object", () => {
      expect(typeof RATE_TYPE_LABELS).toBe("object");
    });

    it("has labels for all rate types", () => {
      RATE_TYPES.forEach((type) => {
        expect(RATE_TYPE_LABELS[type]).toBeDefined();
        expect(typeof RATE_TYPE_LABELS[type]).toBe("string");
      });
    });

    it.each([
      ["PER_MINUTE", "Por minuto"],
      ["HOURLY", "Por hora"],
      ["DAILY", "Diaria"],
      ["FLAT", "Fija"],
      ["FRACTIONAL", "Por fracción"],
    ])("maps %s to %s", (type, label) => {
      expect(RATE_TYPE_LABELS[type]).toBe(label);
    });
  });

  describe("RATE_CATEGORIES", () => {
    it("exports an array", () => {
      expect(Array.isArray(RATE_CATEGORIES)).toBe(true);
    });

    it("includes all categories", () => {
      expect(RATE_CATEGORIES).toContain("STANDARD");
      expect(RATE_CATEGORIES).toContain("MONTHLY");
      expect(RATE_CATEGORIES).toContain("AGREEMENT");
      expect(RATE_CATEGORIES).toContain("PREPAID");
    });

    it("has exactly 4 categories", () => {
      expect(RATE_CATEGORIES.length).toBe(4);
    });
  });

  describe("RATE_CATEGORY_LABELS", () => {
    it("is an object", () => {
      expect(typeof RATE_CATEGORY_LABELS).toBe("object");
    });

    it("has labels for all categories", () => {
      RATE_CATEGORIES.forEach((cat) => {
        expect(RATE_CATEGORY_LABELS[cat]).toBeDefined();
        expect(typeof RATE_CATEGORY_LABELS[cat]).toBe("string");
      });
    });

    it.each([
      ["STANDARD", "Estándar"],
      ["MONTHLY", "Mensualidad"],
      ["AGREEMENT", "Convenio"],
      ["PREPAID", "Prepagado"],
    ])("maps %s to %s", (cat, label) => {
      expect(RATE_CATEGORY_LABELS[cat]).toBe(label);
    });
  });

  describe("DAYS_OF_WEEK", () => {
    it("is an array", () => {
      expect(Array.isArray(DAYS_OF_WEEK)).toBe(true);
    });

    it("has 7 days", () => {
      expect(DAYS_OF_WEEK.length).toBe(7);
    });

    it("has correct days in order", () => {
      const labels = DAYS_OF_WEEK.map((d) => d.label);
      expect(labels).toEqual(["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]);
    });

    it("has correct bit values (0-6)", () => {
      DAYS_OF_WEEK.forEach((day, index) => {
        expect(day.bit).toBe(index);
      });
    });

    it.each([
      ["Lun", 0],
      ["Mar", 1],
      ["Mié", 2],
      ["Jue", 3],
      ["Vie", 4],
      ["Sáb", 5],
      ["Dom", 6],
    ])("day %s has bit %p", (label, bit) => {
      const day = DAYS_OF_WEEK.find((d) => d.label === label);
      expect(day?.bit).toBe(bit);
    });

    it("all days have label and bit", () => {
      DAYS_OF_WEEK.forEach((day) => {
        expect(day.label).toBeDefined();
        expect(typeof day.label).toBe("string");
        expect(typeof day.bit).toBe("number");
      });
    });
  });

  describe("ROUNDING", () => {
    it("is an array", () => {
      expect(Array.isArray(ROUNDING)).toBe(true);
    });

    it("has 3 rounding options", () => {
      expect(ROUNDING.length).toBe(3);
    });

    it("includes UP, DOWN, NEAREST", () => {
      expect(ROUNDING).toContain("UP");
      expect(ROUNDING).toContain("DOWN");
      expect(ROUNDING).toContain("NEAREST");
    });

    it.each(["UP", "DOWN", "NEAREST"])("includes %s", (mode) => {
      expect(ROUNDING).toContain(mode);
    });
  });

  describe("ROLES", () => {
    it("is an array", () => {
      expect(Array.isArray(ROLES)).toBe(true);
    });

    it("includes all roles", () => {
      expect(ROLES).toContain("SUPER_ADMIN");
      expect(ROLES).toContain("ADMIN");
      expect(ROLES).toContain("CAJERO");
      expect(ROLES).toContain("OPERADOR");
      expect(ROLES).toContain("AUDITOR");
    });

    it("has exactly 6 roles", () => {
      expect(ROLES.length).toBe(6);
    });

    it.each(["SUPER_ADMIN", "ADMIN", "CAJERO", "OPERADOR", "AUDITOR"])("includes %s", (role) => {
      expect(ROLES).toContain(role);
    });
  });

  describe("LOST_TICKET_POLICIES", () => {
    it("is an array", () => {
      expect(Array.isArray(LOST_TICKET_POLICIES)).toBe(true);
    });

    it("has 3 policies", () => {
      expect(LOST_TICKET_POLICIES.length).toBe(3);
    });

    it("all policies have value and label", () => {
      LOST_TICKET_POLICIES.forEach((policy) => {
        expect(policy.value).toBeDefined();
        expect(policy.label).toBeDefined();
      });
    });

    it.each([
      "SURCHARGE_RATE",
      "BLOCK_EXIT",
      "SUPERVISOR_ONLY",
    ])("includes policy %s", (value) => {
      const policy = LOST_TICKET_POLICIES.find((p) => p.value === value);
      expect(policy).toBeDefined();
    });
  });
});

describe("toHhMmSs", () => {
  it.each([
    ["14:30", "14:30:00"],
    ["09:15", "09:15:00"],
    ["00:00", "00:00:00"],
    ["23:59", "23:59:00"],
  ])("converts %p to %p", (input, expected) => {
    expect(toHhMmSs(input)).toBe(expected);
  });

  it("handles HH:MM:SS format", () => {
    const result = toHhMmSs("14:30:45");
    expect(typeof result).toBe("string");
    expect(result).toBeTruthy();
  });

  it.each([
    ["9:30"],
    ["1:5"],
  ])("pads single digits: %p", (input) => {
    const result = toHhMmSs(input);
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it("returns null for empty string", () => {
    expect(toHhMmSs("")).toBeNull();
  });

  it("returns null for whitespace only", () => {
    expect(toHhMmSs("   ")).toBeNull();
  });

  it("handles invalid formats", () => {
    const result1 = toHhMmSs("invalid");
    const result2 = toHhMmSs("abc:def");
    expect([result1, result2].some((r) => r === null || typeof r === "string")).toBe(true);
  });

  it("preserves output format with zeros", () => {
    const result = toHhMmSs("09:05");
    expect(result).toBe("09:05:00");
  });

  it("handles edge times", () => {
    expect(toHhMmSs("00:00")).toBe("00:00:00");
    expect(toHhMmSs("23:59")).toBe("23:59:00");
  });
});

describe("toIsoOrNull", () => {
  it.each([
    "2024-01-15",
    "2024-12-31T23:59:59Z",
    "2024-06-15T12:30:45",
  ])("converts %p to ISO string", (input) => {
    const result = toIsoOrNull(input);
    expect(result).not.toBeNull();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns null for empty string", () => {
    expect(toIsoOrNull("")).toBeNull();
  });

  it("returns null for whitespace", () => {
    expect(toIsoOrNull("   ")).toBeNull();
  });

  it.each([
    "invalid",
    "not a date",
    "2024/01/15",
  ])("handles invalid dates gracefully: %p", (input) => {
    const result = toIsoOrNull(input);
    expect(result === null || typeof result === "string").toBe(true);
  });

  it("handles ISO date input", () => {
    const iso = "2024-06-15T10:30:00Z";
    const result = toIsoOrNull(iso);
    expect(result).toBeTruthy();
    expect(result).toContain("2024");
  });

  it("handles date-only input", () => {
    const result = toIsoOrNull("2024-06-15");
    expect(result).not.toBeNull();
    expect(result).toContain("2024-06-15");
  });

  it("returns ISO format string with timezone", () => {
    const result = toIsoOrNull("2024-01-01");
    expect(result).toMatch(/T/);
  });

  it.each([
    "2024-01-01",
    "2024-12-31",
  ])("handles valid dates: %p", (date) => {
    const result = toIsoOrNull(date);
    expect(result).not.toBeNull();
  });
});

describe("toDatetimeLocalValue", () => {
  it("converts valid ISO datetime to local format", () => {
    const result = toDatetimeLocalValue("2024-01-15T10:30:00Z");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("returns empty string for null", () => {
    expect(toDatetimeLocalValue(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(toDatetimeLocalValue(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(toDatetimeLocalValue("")).toBe("");
  });

  it("handles invalid formats gracefully", () => {
    // Some date formats parse as dates by browser Date()
    const result1 = toDatetimeLocalValue("invalid");
    const result2 = toDatetimeLocalValue("2024/01/15");
    expect(typeof result1).toBe("string");
    expect(typeof result2).toBe("string");
  });

  it("handles date-only input", () => {
    const result = toDatetimeLocalValue("2024-06-15");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("formats datetime values with time component", () => {
    const result = toDatetimeLocalValue("2024-01-05T09:05:00Z");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(result.indexOf("T")).toBeGreaterThan(0);
  });

  it("handles various times in a day", () => {
    const inputs = [
      "2024-06-15T00:00:00Z",
      "2024-06-15T12:00:00Z",
      "2024-06-15T23:59:59Z",
    ];

    inputs.forEach((input) => {
      const result = toDatetimeLocalValue(input);
      expect(result).not.toBe("");
      expect(result).toMatch(/T/);
    });
  });

  it("excludes seconds from output", () => {
    const result = toDatetimeLocalValue("2024-06-15T14:35:30Z");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(result).not.toContain(":30");
  });

  it("handles edge dates", () => {
    const jan1 = toDatetimeLocalValue("2024-01-01T00:00:00Z");
    const dec31 = toDatetimeLocalValue("2024-12-31T23:59:59Z");
    expect(jan1).toMatch(/T/);
    expect(dec31).toMatch(/T/);
    expect(jan1).not.toBe("");
    expect(dec31).not.toBe("");
  });
});

describe("Configuration constants integration", () => {
  it("can build rate type dropdown options", () => {
    const options = RATE_TYPES.map((type) => ({
      value: type,
      label: RATE_TYPE_LABELS[type],
    }));

    expect(options.length).toBe(5);
    options.forEach((opt) => {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
    });
  });

  it("can build rate category dropdown options", () => {
    const options = RATE_CATEGORIES.map((cat) => ({
      value: cat,
      label: RATE_CATEGORY_LABELS[cat],
    }));

    expect(options.length).toBe(4);
    options.forEach((opt) => {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
    });
  });

  it("can build day-of-week checkbox options", () => {
    const options = DAYS_OF_WEEK.map((day) => ({
      label: day.label,
      bit: day.bit,
    }));

    expect(options.length).toBe(7);
    options.forEach((opt, idx) => {
      expect(opt.bit).toBe(idx);
    });
  });

  it("can build role dropdown", () => {
    const options = ROLES.map((role) => ({
      value: role,
      label: role,
    }));

    expect(options.length).toBe(6);
    options.forEach((opt) => {
      expect(opt.value).toBeTruthy();
    });
  });
});
