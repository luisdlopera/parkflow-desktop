import { vehicleEntrySchema } from "@/lib/schemas/vehicle.schema";

describe("vehicleEntrySchema - Motorcycle Validation", () => {
  it("accepts a valid motorcycle entry with plate ABC12D", () => {
    const result = vehicleEntrySchema.safeParse({
      plate: "ABC12D",
      type: "MOTORCYCLE",
      countryCode: "CO",
      vehicleCondition: "Buen estado",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid motorcycle entry with lowercase plate", () => {
    const result = vehicleEntrySchema.safeParse({
      plate: "xyz99z",
      type: "MOTORCYCLE",
      countryCode: "CO",
      vehicleCondition: "Buen estado",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a motorcycle entry with 1 custodiedItem (helmet)", () => {
    const result = vehicleEntrySchema.safeParse({
      plate: "ABC12D",
      type: "MOTORCYCLE",
      countryCode: "CO",
      vehicleCondition: "Buen estado",
      custodiedItems: [{ identifier: "LOCKER-01", observations: "Negro", photoUrl: "" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a motorcycle entry with 2 custodiedItems (max allowed)", () => {
    const result = vehicleEntrySchema.safeParse({
      plate: "ABC12D",
      type: "MOTORCYCLE",
      countryCode: "CO",
      vehicleCondition: "Buen estado",
      custodiedItems: [
        { identifier: "LOCKER-01", observations: "Negro", photoUrl: "" },
        { identifier: "LOCKER-02", observations: "Blanco", photoUrl: "" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a car plate (ABC123) when type is MOTORCYCLE", () => {
    const result = vehicleEntrySchema.safeParse({
      plate: "ABC123",
      type: "MOTORCYCLE",
      countryCode: "CO",
      vehicleCondition: "Buen estado",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const plateIssues = result.error.issues.filter((i) => i.path.includes("plate"));
      expect(plateIssues.length).toBeGreaterThan(0);
    }
  });

  it("rejects a motorcycle plate (ABC12D) when type is CAR", () => {
    const result = vehicleEntrySchema.safeParse({
      plate: "ABC12D",
      type: "CAR",
      countryCode: "CO",
      vehicleCondition: "Buen estado",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const plateIssues = result.error.issues.filter((i) => i.path.includes("plate"));
      expect(plateIssues.length).toBeGreaterThan(0);
    }
  });

  it("rejects empty plate when noPlate is unchecked", () => {
    const result = vehicleEntrySchema.safeParse({
      plate: "",
      type: "MOTORCYCLE",
      countryCode: "CO",
      vehicleCondition: "Buen estado",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const plateIssues = result.error.issues.filter((i) => i.path.includes("plate"));
      expect(plateIssues.length).toBeGreaterThan(0);
    }
  });

  it("rejects noPlate without reason", () => {
    const result = vehicleEntrySchema.safeParse({
      plate: "",
      type: "MOTORCYCLE",
      countryCode: "CO",
      noPlate: true,
      noPlateReason: "",
      vehicleCondition: "Buen estado",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const reasonIssues = result.error.issues.filter((i) => i.path.includes("noPlateReason"));
      expect(reasonIssues.length).toBeGreaterThan(0);
    }
  });

  it("accepts noPlate with valid reason", () => {
    const result = vehicleEntrySchema.safeParse({
      plate: "",
      type: "MOTORCYCLE",
      countryCode: "CO",
      noPlate: true,
      noPlateReason: "Placa extraviada al llegar",
      vehicleCondition: "Buen estado",
    });
    expect(result.success).toBe(true);
  });

  it("rejects custodiedItems with empty identifier", () => {
    const result = vehicleEntrySchema.safeParse({
      plate: "ABC12D",
      type: "MOTORCYCLE",
      countryCode: "CO",
      vehicleCondition: "Buen estado",
      custodiedItems: [{ identifier: "", observations: "", photoUrl: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty vehicleCondition", () => {
    const result = vehicleEntrySchema.safeParse({
      plate: "ABC12D",
      type: "MOTORCYCLE",
      countryCode: "CO",
      vehicleCondition: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const condIssues = result.error.issues.filter((i) => i.path.includes("vehicleCondition"));
      expect(condIssues.length).toBeGreaterThan(0);
    }
  });

  it("accepts motorcycle entry without custodiedItems", () => {
    const result = vehicleEntrySchema.safeParse({
      plate: "ABC12D",
      type: "MOTORCYCLE",
      countryCode: "CO",
      vehicleCondition: "Buen estado",
      custodiedItems: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid plate format with special characters for motorcycle", () => {
    const result = vehicleEntrySchema.safeParse({
      plate: "AB@12D",
      type: "MOTORCYCLE",
      countryCode: "CO",
      vehicleCondition: "Buen estado",
    });
    expect(result.success).toBe(false);
  });

  it("rejects motorcycle with type BICYCLE (plate doesn't match bicycle pattern)", () => {
    const result = vehicleEntrySchema.safeParse({
      plate: "ABC12D",
      type: "BICYCLE",
      countryCode: "CO",
      vehicleCondition: "Buen estado",
    });
    expect(result.success).toBe(false);
  });
});
