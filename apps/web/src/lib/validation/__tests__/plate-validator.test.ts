import { validatePlate } from "@/lib/validation/plate-validator";

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
});
