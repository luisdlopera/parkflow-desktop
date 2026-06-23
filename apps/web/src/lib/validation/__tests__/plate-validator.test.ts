import { describe, it, expect } from "vitest";
import {
  normalizePlate,
  validatePlate,
  inferVehicleType,
  translateVehicleType,
  getPlateFormatHint,
  getPlatePlaceholder,
} from "../plate-validator";

describe("normalizePlate", () => {
  it.each([
    ["ABC123", "ABC123"],
    ["abc123", "ABC123"],
    ["aBc123", "ABC123"],
    ["ABC-123", "ABC123"],
    ["ABC_123", "ABC123"],
    ["ABC 123", "ABC123"],
    ["a@b#c$1%2&3", "ABC123"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizePlate(input)).toBe(expected);
  });

  it("handles empty string", () => {
    expect(normalizePlate("")).toBe("");
  });

  it("handles only special characters", () => {
    expect(normalizePlate("@#$%^&")).toBe("");
  });

  it("preserves numbers", () => {
    expect(normalizePlate("123")).toBe("123");
  });

  it("handles unicode", () => {
    const result = normalizePlate("ÑÑÑ123");
    expect(result).not.toContain("Ñ");
  });

  it("handles mixed case and special chars", () => {
    expect(normalizePlate("AbC-123_XyZ")).toBe("ABC123XYZ");
  });
});

describe("validatePlate - Colombian formats", () => {
  it.each([
    ["ABC123", "CAR", true],
    ["ABC123", "VAN", true],
    ["ABC123", "TRUCK", true],
    ["ABC123", "BUS", true],
    ["ABC123", "ELECTRIC", true],
    ["XYZ999", "CAR", true],
    ["AAA000", "CAR", true],
  ])("validates car plate %s as %s", (plate, type, isValid) => {
    const result = validatePlate("CO", type, plate);
    expect(result.isValid).toBe(isValid);
    expect(result.normalizedPlate).toBe(plate);
  });

  it.each([
    ["ABC12A", "MOTORCYCLE", true],
    ["XYZ98Z", "MOTORCYCLE", true],
    ["AAA00A", "MOTORCYCLE", true],
    ["ABC123", "MOTORCYCLE", false],
  ])("validates motorcycle plate %s", (plate, type, isValid) => {
    const result = validatePlate("CO", type, plate);
    expect(result.isValid).toBe(isValid);
  });

  it.each([
    ["BICI001", "BICYCLE", true],
    ["BIC123", "BICYCLE", true],
    ["B1C2D3", "BICYCLE", true],
  ])("validates bicycle plate %s", (plate, type, isValid) => {
    const result = validatePlate("CO", type, plate);
    expect(result.isValid).toBe(isValid);
  });

  it.each([
    ["", "CAR", false],
    ["AB123", "CAR", false],
    ["ABCD123", "CAR", false],
    ["ABC1234", "CAR", false],
  ])("rejects invalid car plates %s", (plate, type, isValid) => {
    const result = validatePlate("CO", type, plate);
    expect(result.isValid).toBe(isValid);
  });

  it("includes error message for invalid plates", () => {
    const result = validatePlate("CO", "CAR", "invalid");
    expect(result.errorMessage).toBeTruthy();
    expect(result.isValid).toBe(false);
  });

  it("detects cross-type matches in error", () => {
    const result = validatePlate("CO", "CAR", "ABC12A");
    expect(result.errorMessage).toContain("moto");
  });

  it("includes example in error message", () => {
    const result = validatePlate("CO", "CAR", "bad");
    expect(result.errorMessage).toContain("ABC123");
  });

  it("handles empty plates", () => {
    const result = validatePlate("CO", "CAR", "");
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBeTruthy();
  });

  it("handles unsupported countries", () => {
    const result = validatePlate("US", "CAR", "ABC123");
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain("Pais no soportado");
  });

  it("handles null country defaults to CO", () => {
    const result1 = validatePlate(null, "CAR", "ABC123");
    const result2 = validatePlate("CO", "CAR", "ABC123");
    expect(result1).toEqual(result2);
  });

  it("handles undefined country defaults to CO", () => {
    const result1 = validatePlate(undefined, "CAR", "ABC123");
    const result2 = validatePlate("CO", "CAR", "ABC123");
    expect(result1).toEqual(result2);
  });

  it("normalizes input before validating", () => {
    const result1 = validatePlate("CO", "CAR", "abc123");
    const result2 = validatePlate("CO", "CAR", "ABC123");
    expect(result1.isValid).toBe(result2.isValid);
  });
});

describe("inferVehicleType", () => {
  it.each([
    ["ABC123", "CAR"],
    ["XYZ999", "CAR"],
    ["ABC12A", "MOTORCYCLE"],
    ["XYZ98Z", "MOTORCYCLE"],
  ])("infers vehicle type for plate %s as %s", (plate, expected) => {
    expect(inferVehicleType("CO", plate)).toBe(expected);
  });

  it("returns MOTORCYCLE before CAR on match", () => {
    expect(inferVehicleType("CO", "ABC12A")).toBe("MOTORCYCLE");
  });

  it("handles null country code", () => {
    const result = inferVehicleType(null, "ABC123");
    expect(result).toBeTruthy();
  });

  it("handles empty plate", () => {
    expect(inferVehicleType("CO", "")).toBeNull();
  });

  it("is case insensitive for country", () => {
    expect(inferVehicleType("co", "ABC123")).toBe("CAR");
    expect(inferVehicleType("Co", "ABC123")).toBe("CAR");
  });

  it("handles whitespace in plate", () => {
    const result = inferVehicleType("CO", "ABC 123");
    expect(result).toBeTruthy();
  });

  it("infers bicycle type", () => {
    const result = inferVehicleType("CO", "BICI001");
    expect(result).toBe("BICYCLE");
  });
});

describe("translateVehicleType", () => {
  it.each([
    ["CAR", "carro"],
    ["MOTORCYCLE", "moto"],
    ["VAN", "van"],
    ["TRUCK", "camión"],
    ["BUS", "bus"],
    ["BICYCLE", "bicicleta"],
    ["ELECTRIC", "eléctrico"],
  ])("translates %s to %s", (type, expected) => {
    expect(translateVehicleType(type)).toBe(expected);
  });

  it("is case insensitive", () => {
    expect(translateVehicleType("car")).toBe("carro");
    expect(translateVehicleType("Car")).toBe("carro");
    expect(translateVehicleType("CAR")).toBe("carro");
  });

  it("returns default for unknown types", () => {
    expect(translateVehicleType("UNKNOWN")).toBe("otro vehículo");
    expect(translateVehicleType("HELICOPTER")).toBe("otro vehículo");
  });

  it("handles empty string", () => {
    expect(translateVehicleType("")).toBe("otro vehículo");
  });

  it("all translations are in Spanish", () => {
    const types = ["CAR", "MOTORCYCLE", "VAN", "TRUCK", "BUS", "BICYCLE", "ELECTRIC"];
    types.forEach((type) => {
      const translation = translateVehicleType(type);
      expect(translation).toBeTruthy();
      expect(translation.length).toBeGreaterThan(0);
    });
  });
});

describe("getPlateFormatHint", () => {
  it.each([
    ["CAR", "CO"],
    ["MOTORCYCLE", "CO"],
    ["TRUCK", "CO"],
    ["BICYCLE", "CO"],
  ])("returns format hint for %s", (type, country) => {
    const hint = getPlateFormatHint(type, country);
    expect(hint).toBeTruthy();
    expect(hint.length).toBeGreaterThan(0);
  });

  it("is case insensitive for type", () => {
    const hint1 = getPlateFormatHint("car", "CO");
    const hint2 = getPlateFormatHint("CAR", "CO");
    expect(hint1).toBe(hint2);
  });

  it("defaults to CO country", () => {
    const hint = getPlateFormatHint("CAR");
    expect(hint).toBeTruthy();
  });

  it("returns default hint for unknown types", () => {
    const hint = getPlateFormatHint("UNKNOWN", "CO");
    expect(hint).toBe("3 letras + 3 números");
  });

  it("contains helpful format information", () => {
    const carHint = getPlateFormatHint("CAR", "CO");
    expect(carHint).toContain("3");
  });

  it("all hints are non-empty", () => {
    const types = ["CAR", "MOTORCYCLE", "TRUCK", "BICYCLE", "OTHER"];
    types.forEach((type) => {
      const hint = getPlateFormatHint(type, "CO");
      expect(hint).toBeTruthy();
    });
  });
});

describe("getPlatePlaceholder", () => {
  it.each([
    ["CAR", "ABC123"],
    ["MOTORCYCLE", "ABC12A"],
    ["BICYCLE", "BICI001"],
  ])("returns placeholder for %s", (type, expected) => {
    expect(getPlatePlaceholder(type, "CO")).toBe(expected);
  });

  it("is case insensitive for type", () => {
    const p1 = getPlatePlaceholder("car", "CO");
    const p2 = getPlatePlaceholder("CAR", "CO");
    expect(p1).toBe(p2);
  });

  it("defaults to CO", () => {
    const p = getPlatePlaceholder("CAR");
    expect(p).toBe("ABC123");
  });

  it("returns generic placeholder for unknown types", () => {
    const p = getPlatePlaceholder("UNKNOWN", "CO");
    expect(p).toBe("ABC123");
  });

  it("all placeholders are valid according to rules", () => {
    const types = ["CAR", "MOTORCYCLE", "TRUCK", "VAN", "BUS", "BICYCLE", "ELECTRIC", "OTHER"];
    types.forEach((type) => {
      const placeholder = getPlatePlaceholder(type, "CO");
      const result = validatePlate("CO", type, placeholder);
      expect(result.isValid).toBe(true);
    });
  });

  it("placeholders are usable examples", () => {
    const placeholders = [
      getPlatePlaceholder("CAR", "CO"),
      getPlatePlaceholder("MOTORCYCLE", "CO"),
      getPlatePlaceholder("BICYCLE", "CO"),
    ];
    placeholders.forEach((p) => {
      expect(p).toBeTruthy();
      expect(p.length).toBeGreaterThan(0);
    });
  });
});

describe("integration: full validation flow", () => {
  it("normalizes, infers type, and validates", () => {
    const userInput = "abc-123";
    const normalized = normalizePlate(userInput);
    const inferred = inferVehicleType("CO", normalized);
    const validated = validatePlate("CO", inferred || "CAR", normalized);
    expect(validated.isValid).toBe(true);
  });

  it("provides helpful hints for invalid plates", () => {
    const inferred = inferVehicleType("CO", "ABC12");
    if (!inferred) {
      const hint = getPlateFormatHint("CAR", "CO");
      expect(hint).toBeTruthy();
    }
  });

  it("shows user-friendly translation", () => {
    const type = inferVehicleType("CO", "ABC12A");
    const translation = translateVehicleType(type || "OTHER");
    expect(translation).toBeTruthy();
  });

  it("handles complete user correction workflow", () => {
    const original = "invalido";
    const normalized = normalizePlate(original);
    const result = validatePlate("CO", "CAR", normalized);
    if (!result.isValid) {
      const placeholder = getPlatePlaceholder("CAR", "CO");
      const corrected = validatePlate("CO", "CAR", placeholder);
      expect(corrected.isValid).toBe(true);
    }
  });

  it("validates all Colombian vehicle types", () => {
    const plates = {
      CAR: "ABC123",
      MOTORCYCLE: "ABC12A",
      VAN: "ABC123",
      TRUCK: "ABC123",
      BUS: "ABC123",
      ELECTRIC: "ABC123",
      BICYCLE: "BICI001",
      OTHER: "AB123",
    };
    Object.entries(plates).forEach(([type, plate]) => {
      const result = validatePlate("CO", type, plate);
      expect(result.isValid).toBe(true);
    });
  });
});
