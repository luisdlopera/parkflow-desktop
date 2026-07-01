import { describe, it, expect } from "vitest";
import { validateContract } from "../contract-validator";

describe("contract-validator", () => {
  it("should validate a correct contract payload successfully", () => {
    const payload = {
      plate: "ABC-123",
      type: "AUTOMOBILE",
      operatorUserId: "123e4567-e89b-12d3-a456-426614174000"
    };

    const result = validateContract("operationEntryCreate", payload);

    expect(result.success).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("should capture validation failures for missing required fields", () => {
    const payload = {
      type: "AUTOMOBILE"
    };

    const result = validateContract("operationEntryCreate", payload);

    expect(result.success).toBe(false);
    expect(result.issues).toContainEqual({
      field: "plate",
      message: "El campo es requerido."
    });
    expect(result.issues).toContainEqual({
      field: "operatorUserId",
      message: "El campo es requerido."
    });
  });

  it("should capture pattern mismatch failures", () => {
    const payload = {
      plate: "invalid_plate!!",
      type: "AUTOMOBILE",
      operatorUserId: "123e4567-e89b-12d3-a456-426614174000"
    };

    const result = validateContract("operationEntryCreate", payload);

    expect(result.success).toBe(false);
    expect(result.issues[0].field).toBe("plate");
  });
});
