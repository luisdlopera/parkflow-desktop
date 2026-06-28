import { describe, it, expect } from "vitest";
import {
  normalizePlate,
  inferVehicleType,
} from "@/lib/validation/plate-validator";

describe("normalizePlate", () => {
  it("converts to uppercase and strips non-alphanumeric", () => {
    expect(normalizePlate("abc-123")).toBe("ABC123");
  });

  it("handles already-normalized plates", () => {
    expect(normalizePlate("ABC123")).toBe("ABC123");
  });

  it("strips spaces", () => {
    expect(normalizePlate(" ABC 123 ")).toBe("ABC123");
  });

  it("returns empty string for empty input", () => {
    expect(normalizePlate("")).toBe("");
  });

  it("handles motorcycle plate format", () => {
    expect(normalizePlate("abc12a")).toBe("ABC12A");
  });
});

describe("inferVehicleType", () => {
  it("infers CAR for Colombian car plate (3 letters + 3 digits)", () => {
    const result = inferVehicleType("CO", "ABC123");
    expect(result).toBe("CAR");
  });

  it("infers MOTORCYCLE for Colombian moto plate (3 letters + 2 digits + 1 letter)", () => {
    const result = inferVehicleType("CO", "ABC12A");
    expect(result).toBe("MOTORCYCLE");
  });

  it("returns null for empty plate", () => {
    const result = inferVehicleType("CO", "");
    expect(result).toBeNull();
  });

  it("falls back to CO when countryCode is null", () => {
    const result = inferVehicleType(null, "ABC123");
    expect(result).toBe("CAR");
  });

  it("returns null for plate too short to match any pattern", () => {
    // "A" is 1 char — below OTHER minimum (2) and doesn't match car/moto
    const result = inferVehicleType("CO", "A");
    expect(result).toBeNull();
  });
});
