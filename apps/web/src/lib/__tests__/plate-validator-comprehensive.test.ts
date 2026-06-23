import { describe, it, expect } from "vitest";
import {
  normalizePlate,
  validatePlate,
  inferVehicleType,
  translateVehicleType,
  getPlateFormatHint,
  getPlatePlaceholder,
  plateRules,
} from "../validation/plate-validator";

describe("normalizePlate", () => {
  it.each([
    { input: "abc123", expected: "ABC123" },
    { input: "ABC123", expected: "ABC123" },
    { input: "ABC-123", expected: "ABC123" },
    { input: "ABC 123", expected: "ABC123" },
    { input: "ABC@123!", expected: "ABC123" },
    { input: "aBc@123", expected: "ABC123" },
    { input: "", expected: "" },
    { input: "---", expected: "" },
    { input: "   ", expected: "" },
    { input: "A1B2C3", expected: "A1B2C3" },
    { input: "XYZ789", expected: "XYZ789" },
    { input: "123ABC", expected: "123ABC" },
  ])("normalizes '$input' to '$expected'", ({ input, expected }) => {
    expect(normalizePlate(input)).toBe(expected);
  });
});

describe("validatePlate - COLOMBIA (CO)", () => {
  describe("CAR validation", () => {
    it.each([
      { plate: "ABC123", expected: true },
      { plate: "XYZ999", expected: true },
      { plate: "AAA000", expected: true },
      { plate: "ABC12", expected: false },
      { plate: "ABC1234", expected: false },
      { plate: "ABCD123", expected: false },
      { plate: "", expected: false },
    ])("validates CAR plate '$plate'", ({ plate, expected }) => {
      const result = validatePlate("CO", "CAR", plate);
      expect(result.isValid).toBe(expected);
      expect(result.normalizedPlate).toBeDefined();
    });

    it("provides error message for invalid CAR plate", () => {
      const result = validatePlate("CO", "CAR", "ABC12");
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("3 letras");
    });
  });

  describe("MOTORCYCLE validation", () => {
    it.each([
      { plate: "ABC12A", expected: true },
      { plate: "XYZ99B", expected: true },
      { plate: "AAA00Z", expected: true },
      { plate: "ABC123", expected: false },
      { plate: "ABC12", expected: false },
    ])("validates MOTORCYCLE plate '$plate'", ({ plate, expected }) => {
      const result = validatePlate("CO", "MOTORCYCLE", plate);
      expect(result.isValid).toBe(expected);
    });

    it("detects when CAR plate matches MOTORCYCLE format", () => {
      const result = validatePlate("CO", "MOTORCYCLE", "ABC123");
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("carro");
    });
  });

  describe("BICYCLE validation", () => {
    it.each([
      { plate: "BICI", expected: true },
      { plate: "BIC001", expected: true },
      { plate: "B", expected: false },
      { plate: "AB", expected: false },
      { plate: "", expected: false },
    ])("validates BICYCLE plate '$plate'", ({ plate, expected }) => {
      const result = validatePlate("CO", "BICYCLE", plate);
      expect(result.isValid).toBe(expected);
    });
  });

  describe("OTHER vehicle type validation", () => {
    it.each([
      { plate: "AB", expected: true },
      { plate: "ABC", expected: true },
      { plate: "ABC123", expected: true },
      { plate: "CD1234", expected: true },
      { plate: "A", expected: false },
      { plate: "", expected: false },
    ])("validates OTHER plate '$plate'", ({ plate, expected }) => {
      const result = validatePlate("CO", "OTHER", plate);
      expect(result.isValid).toBe(expected);
    });
  });

  describe("Edge cases", () => {
    it("handles empty plate", () => {
      const result = validatePlate("CO", "CAR", "");
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("vacía");
    });

    it("handles plate with only symbols", () => {
      const result = validatePlate("CO", "CAR", "@#$");
      expect(result.isValid).toBe(false);
    });

    it("handles unsupported vehicle type", () => {
      const result = validatePlate("CO", "UNKNOWN_TYPE", "ABC123");
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("no soportado");
    });

    it("handles unsupported country", () => {
      const result = validatePlate("BR", "CAR", "ABC1234");
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("Pais no soportado");
    });
  });
});

describe("inferVehicleType", () => {
  it.each([
    { plate: "ABC123", expected: "CAR" },
    { plate: "ABC12A", expected: "MOTORCYCLE" },
    { plate: "BICI001", expected: "BICYCLE" },
    { plate: "AB", expected: "OTHER" },
    { plate: "", expected: null },
    { plate: "@@@", expected: null },
  ])("infers vehicle type from plate '$plate'", ({ plate, expected }) => {
    expect(inferVehicleType("CO", plate)).toBe(expected);
  });

  it("uses default country code when not provided", () => {
    const result = inferVehicleType(undefined, "ABC123");
    expect(result).toBe("CAR");
  });

  it("handles null country code", () => {
    const result = inferVehicleType(null, "ABC123");
    expect(result).toBe("CAR");
  });

  it("prioritizes MOTORCYCLE when it matches", () => {
    const result = inferVehicleType("CO", "ABC12A");
    expect(result).toBe("MOTORCYCLE");
  });

  it("falls back to CAR when both CAR and OTHER match", () => {
    const result = inferVehicleType("CO", "ABC123");
    expect(result).toBe("CAR");
  });
});

describe("translateVehicleType", () => {
  it.each([
    { type: "CAR", expected: "carro" },
    { type: "car", expected: "carro" },
    { type: "MOTORCYCLE", expected: "moto" },
    { type: "motorcycle", expected: "moto" },
    { type: "VAN", expected: "van" },
    { type: "TRUCK", expected: "camión" },
    { type: "BUS", expected: "bus" },
    { type: "BICYCLE", expected: "bicicleta" },
    { type: "ELECTRIC", expected: "eléctrico" },
    { type: "OTHER", expected: "otro vehículo" },
    { type: "UNKNOWN", expected: "otro vehículo" },
  ])("translates '$type' to '$expected'", ({ type, expected }) => {
    expect(translateVehicleType(type)).toBe(expected);
  });
});

describe("getPlateFormatHint", () => {
  it.each([
    { vehicleType: "CAR", expected: "3 letras y 3 números" },
    { vehicleType: "MOTORCYCLE", expected: "3 letras, 2 números y 1 letra" },
    { vehicleType: "BICYCLE", expected: "3 a 12 letras o números" },
    { vehicleType: "OTHER", expected: "entre 2 y 10 caracteres" },
    { vehicleType: "UNKNOWN", expected: "3 letras + 3 números" },
  ])("provides hint for $vehicleType", ({ vehicleType, expected }) => {
    const hint = getPlateFormatHint(vehicleType, "CO");
    expect(hint).toContain(expected.split(" ")[0]); // Check at least first word
  });

  it("uses default country code", () => {
    const hint = getPlateFormatHint("CAR");
    expect(hint).toBeDefined();
  });
});

describe("getPlatePlaceholder", () => {
  it.each([
    { vehicleType: "CAR", expected: "ABC123" },
    { vehicleType: "MOTORCYCLE", expected: "ABC12A" },
    { vehicleType: "BICYCLE", expected: "BICI001" },
    { vehicleType: "OTHER", expected: "CD1234" },
    { vehicleType: "UNKNOWN", expected: "ABC123" },
  ])("provides placeholder for $vehicleType", ({ vehicleType, expected }) => {
    expect(getPlatePlaceholder(vehicleType, "CO")).toBe(expected);
  });

  it("uses default country code", () => {
    const placeholder = getPlatePlaceholder("CAR");
    expect(placeholder).toBe("ABC123");
  });
});

describe("plateRules", () => {
  it("contains rules for all Colombian vehicle types", () => {
    const types = ["CAR", "VAN", "TRUCK", "BUS", "ELECTRIC", "MOTORCYCLE", "BICYCLE", "OTHER"];
    types.forEach(type => {
      const rule = plateRules.find(r => r.enabled && r.countryCode === "CO" && r.vehicleType === type);
      expect(rule).toBeDefined();
    });
  });

  it("all rules have valid patterns", () => {
    plateRules.forEach(rule => {
      expect(rule.pattern).toBeInstanceOf(RegExp);
      expect(rule.example).toBeDefined();
      expect(rule.errorMessage).toBeDefined();
    });
  });

  it("pattern matches the provided example", () => {
    plateRules.forEach(rule => {
      if (rule.enabled) {
        expect(rule.pattern.test(rule.example)).toBe(true);
      }
    });
  });
});

describe("Cross-plate validation scenarios", () => {
  it("validates all Colombian plate examples", () => {
    const validExamples = [
      { type: "CAR", plate: "ABC123" },
      { type: "MOTORCYCLE", plate: "ABC12A" },
      { type: "VAN", plate: "XYZ789" },
      { type: "TRUCK", plate: "PQR456" },
      { type: "BUS", plate: "UVW321" },
      { type: "BICYCLE", plate: "BICI" },
      { type: "ELECTRIC", plate: "ELE111" },
    ];

    validExamples.forEach(({ type, plate }) => {
      const result = validatePlate("CO", type, plate);
      expect(result.isValid).toBe(true, `${type} with plate ${plate} should be valid`);
    });
  });

  it("rejects invalid formatting", () => {
    const invalidExamples = [
      { type: "CAR", plate: "ABCD123" }, // too many letters
      { type: "CAR", plate: "AB1234" }, // not enough letters
      { type: "MOTORCYCLE", plate: "ABC123" }, // CAR format, not motorcycle
      { type: "MOTORCYCLE", plate: "ABCD12A" }, // too many letters
    ];

    invalidExamples.forEach(({ type, plate }) => {
      const result = validatePlate("CO", type, plate);
      expect(result.isValid).toBe(false, `${type} with plate ${plate} should be invalid`);
    });
  });
});

describe("Integration: Full validation flow", () => {
  it("normalizes, infers, and validates in sequence", () => {
    const rawPlate = "abc-123";
    const normalized = normalizePlate(rawPlate);
    expect(normalized).toBe("ABC123");

    const inferred = inferVehicleType("CO", normalized);
    expect(inferred).toBe("CAR");

    const result = validatePlate("CO", inferred, normalized);
    expect(result.isValid).toBe(true);
    expect(result.normalizedPlate).toBe("ABC123");
  });

  it("provides helpful error message with cross-match suggestion", () => {
    // User enters a motorcycle plate but selects CAR
    const result = validatePlate("CO", "CAR", "ABC12A");
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain("moto"); // Should suggest they meant motorcycle
  });
});
