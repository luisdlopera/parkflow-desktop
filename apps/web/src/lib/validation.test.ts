import { describe, it, expect } from "vitest";
import {
  requiredString,
  emailSchema,
  phoneSchema,
  plateSchema,
  positiveNumber,
  nonNegativeNumber,
} from "./validation";

describe("requiredString", () => {
  const schema = requiredString("Campo requerido");

  it.each([
    ["valid string", true],
    ["another valid string", true],
    ["a", true],
    ["special!@#$%", true],
    ["123456", true],
    ["", false],
    [null, false],
    [undefined, false],
  ])("validates %p -> %p", (input, isValid) => {
    const result = schema.safeParse(input);
    expect(result.success).toBe(isValid);
  });

  it("returns custom error message on failure", () => {
    const result = requiredString("Custom error").safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Custom error");
    }
  });
});

describe("emailSchema", () => {
  const schema = emailSchema();

  it.each([
    ["test@example.com", true],
    ["user+tag@domain.co.uk", true],
    ["admin@parkflow.io", true],
    ["test_123@test-domain.com", true],
    ["invalid.email", false],
    ["@example.com", false],
    ["test@", false],
    ["test@.com", false],
    ["", false],
    [null, false],
    [undefined, false],
  ])("validates %p -> %p", (input, isValid) => {
    const result = schema.safeParse(input);
    expect(result.success).toBe(isValid);
  });

  it("uses custom message", () => {
    const customMsg = "Correo inválido";
    const schema = emailSchema(customMsg);
    const result = schema.safeParse("invalid");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(customMsg);
    }
  });
});

describe("phoneSchema", () => {
  const schema = phoneSchema();

  it.each([
    ["+573001234567", true],
    ["573001234567", true],
    ["+34912345678", true],
    ["1234567", true],
    ["12345678901234", true],
    ["+123456789012345", true],
    ["123456", false], // too short
    ["+12345678901234567", false], // too long
    ["abc1234567", false],
    ["", false],
    [null, false],
    [undefined, false],
  ])("validates %p -> %p", (input, isValid) => {
    const result = schema.safeParse(input);
    expect(result.success).toBe(isValid);
  });

  it("uses custom message", () => {
    const customMsg = "Teléfono inválido";
    const schema = phoneSchema(customMsg);
    const result = schema.safeParse("123");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(customMsg);
    }
  });
});

describe("plateSchema", () => {
  const schema = plateSchema();

  it.each([
    ["AAA123", true],
    ["aaa123", true], // transforms to uppercase
    ["BBB1234", true],
    ["XYZ0000", true],
  ])("validates valid plates: %p -> %p", (input, isValid) => {
    const result = schema.safeParse(input);
    expect(result.success).toBe(isValid);
  });

  it("validates plate length (5-7 chars)", () => {
    // AAA12 is 5 chars, which is valid
    expect(schema.safeParse("AAA12").success).toBe(true);
  });

  it("rejects too long plates", () => {
    expect(schema.safeParse("AAA12345").success).toBe(false);
  });

  it("rejects special characters", () => {
    expect(schema.safeParse("AAA-123").success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(schema.safeParse("").success).toBe(false);
  });

  it("converts to uppercase", () => {
    const result = plateSchema().safeParse("abc123");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("ABC123");
    }
  });

  it("uses custom message on validation error", () => {
    const customMsg = "Placa inválida";
    const schema = plateSchema(customMsg);
    const result = schema.safeParse("INVALID!@#");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(customMsg);
    }
  });

  it("validates 5-7 character alphanumeric strings", () => {
    expect(schema.safeParse("ABC12").success).toBe(true); // 5 chars
    expect(schema.safeParse("ABC1234").success).toBe(true); // 7 chars
  });
});

describe("positiveNumber", () => {
  const schema = positiveNumber("Número positivo requerido");

  it.each([
    [1, true],
    [0.1, true],
    [100, true],
    [999999, true],
    [0, false],
    [-1, false],
    [-0.5, false],
    [null, false],
    [undefined, false],
    ["123", false],
  ])("validates %p -> %p", (input, isValid) => {
    const result = schema.safeParse(input);
    expect(result.success).toBe(isValid);
  });

  it("uses custom message", () => {
    const customMsg = "Debe ser positivo";
    const schema = positiveNumber(customMsg);
    const result = schema.safeParse(0);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(customMsg);
    }
  });
});

describe("nonNegativeNumber", () => {
  const schema = nonNegativeNumber("Número no negativo requerido");

  it.each([
    [0, true],
    [1, true],
    [0.5, true],
    [100, true],
    [999999, true],
    [-0.1, false],
    [-1, false],
    [-100, false],
    [null, false],
    [undefined, false],
    ["0", false],
  ])("validates %p -> %p", (input, isValid) => {
    const result = schema.safeParse(input);
    expect(result.success).toBe(isValid);
  });

  it("allows zero", () => {
    const result = nonNegativeNumber("Error").safeParse(0);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(0);
    }
  });

  it("uses custom message", () => {
    const customMsg = "No puede ser negativo";
    const schema = nonNegativeNumber(customMsg);
    const result = schema.safeParse(-1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(customMsg);
    }
  });
});
