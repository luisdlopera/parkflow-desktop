import { validatePlate, inferVehicleType, normalizePlate, translateVehicleType } from "@/lib/validation/plate-validator";

describe("normalizePlate", () => {
  it("converts to uppercase", () => {
    expect(normalizePlate("abc123")).toBe("ABC123");
  });

  it("removes spaces", () => {
    expect(normalizePlate("AB C 123")).toBe("ABC123");
  });

  it("removes hyphens", () => {
    expect(normalizePlate("ABC-123")).toBe("ABC123");
  });

  it("returns empty string for empty input", () => {
    expect(normalizePlate("")).toBe("");
    expect(normalizePlate(null as unknown as string)).toBe("");
    expect(normalizePlate(undefined as unknown as string)).toBe("");
  });
});

describe("translateVehicleType", () => {
  it("translates CAR to carro", () => {
    expect(translateVehicleType("CAR")).toMatch(/carro/i);
  });

  it("translates MOTORCYCLE to moto", () => {
    expect(translateVehicleType("MOTORCYCLE")).toMatch(/moto/i);
  });
});

describe("inferVehicleType", () => {
  it("returns null for empty plate", () => {
    expect(inferVehicleType("CO", "")).toBeNull();
  });

  it("returns MOTORCYCLE for ABC12A format (3 letters + 2 numbers + 1 letter)", () => {
    expect(inferVehicleType("CO", "ABC12A")).toBe("MOTORCYCLE");
  });

  it("returns CAR for ABC123 format (3 letters + 3 numbers)", () => {
    expect(inferVehicleType("CO", "ABC123")).toBe("CAR");
  });

  it("returns BICYCLE for short alphanumeric identifiers (permissive BICYCLE pattern)", () => {
    expect(inferVehicleType("CO", "12345")).toBe("BICYCLE");
  });

  it("returns CAR over OTHER when both match", () => {
    const result = inferVehicleType("CO", "XYZ789");
    expect(result).toBe("CAR");
  });

  it("returns MOTORCYCLE over CAR when both match", () => {
    const result = inferVehicleType("CO", "ABC12A");
    expect(result).toBe("MOTORCYCLE");
  });

  it("returns null for unsupported country", () => {
    expect(inferVehicleType("XX", "ABC123")).toBeNull();
  });
});

describe("validatePlate", () => {
  it("accepts a motorcycle plate like zql43a when vehicleType is MOTORCYCLE", () => {
    const res = validatePlate("CO", "MOTORCYCLE", "zql43a");
    expect(res.isValid).toBe(true);
    expect(res.normalizedPlate).toBe("ZQL43A");
  });

  it("rejects a malformed plate for car", () => {
    const res = validatePlate("CO", "CAR", "zql43a");
    expect(res.isValid).toBe(false);
    expect(res.errorMessage).toMatch(/Para carro/);
  });

  it("rejects empty plate", () => {
    const res = validatePlate("CO", "CAR", "");
    expect(res.isValid).toBe(false);
    expect(res.errorMessage).toMatch(/vacía/);
  });

  it("rejects motorcycle plate when type is CAR with a suggestion", () => {
    const res = validatePlate("CO", "MOTORCYCLE", "ABC123");
    expect(res.isValid).toBe(false);
    expect(res.errorMessage).toMatch(/carro/);
  });

  it("rejects car plate when type is MOTORCYCLE with a suggestion", () => {
    const res = validatePlate("CO", "CAR", "ABC12A");
    expect(res.isValid).toBe(false);
    expect(res.errorMessage).toMatch(/moto/);
  });

  it("accepts car plate for VAN type (same format)", () => {
    const res = validatePlate("CO", "VAN", "ABC123");
    expect(res.isValid).toBe(true);
  });

  it("normalizes NP- format correctly (no-plate placeholder)", () => {
    const result = normalizePlate("NP-K4XM8A-B3C0");
    expect(result).toBe("NPK4XM8AB3C0");
  });

  it("rejects NP- format for CAR type (only valid when noPlate flag is set)", () => {
    const res = validatePlate("CO", "CAR", "NP-K4XM8A");
    expect(res.isValid).toBe(false);
  });

  it("rejects for unsupported country", () => {
    const res = validatePlate("XX", "CAR", "ABC123");
    expect(res.isValid).toBe(false);
    expect(res.errorMessage).toMatch(/Pais no soportado/);
  });
});
