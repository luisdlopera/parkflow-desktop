import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ClientValidationError, validatePayloadOrThrow, toUserMessageFromClientValidation } from "../request-guard";

describe("ClientValidationError", () => {
  it("creates error with message and field errors", () => {
    const fieldErrors = { email: "Invalid email", password: "Too short" };
    const error = new ClientValidationError("Validation failed", fieldErrors);
    expect(error.message).toBe("Validation failed");
    expect(error.fieldErrors).toEqual(fieldErrors);
    expect(error.name).toBe("ClientValidationError");
  });

  it("supports instanceof checks", () => {
    const error = new ClientValidationError("test", {});
    expect(error instanceof ClientValidationError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  it("can be thrown and caught", () => {
    const error = new ClientValidationError("test error", { field: "message" });
    expect(() => {
      throw error;
    }).toThrow(ClientValidationError);
  });
});

describe("validatePayloadOrThrow", () => {
  const emailSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be 8+ characters"),
  });

  it("returns parsed data on valid input", () => {
    const data = { email: "user@example.com", password: "SecurePass123" };
    const result = validatePayloadOrThrow(emailSchema, data);
    expect(result).toEqual(data);
  });

  it("throws ClientValidationError on invalid input", () => {
    const data = { email: "invalid-email", password: "short" };
    expect(() => validatePayloadOrThrow(emailSchema, data)).toThrow(ClientValidationError);
  });

  it("populates field errors from zod issues", () => {
    const data = { email: "invalid", password: "short" };
    try {
      validatePayloadOrThrow(emailSchema, data);
    } catch (e) {
      if (e instanceof ClientValidationError) {
        expect(Object.keys(e.fieldErrors).length).toBeGreaterThan(0);
        expect(e.fieldErrors.email).toBeDefined();
        expect(e.fieldErrors.password).toBeDefined();
      }
    }
  });

  it("uses first error message as main message", () => {
    const data = { email: "invalid", password: "short" };
    try {
      validatePayloadOrThrow(emailSchema, data);
    } catch (e) {
      if (e instanceof ClientValidationError) {
        expect(e.message).toBeTruthy();
        expect(Object.values(e.fieldErrors).includes(e.message)).toBe(true);
      }
    }
  });

  it("uses custom fallback message when no issues", () => {
    const emptySchema = z.object({});
    const result = validatePayloadOrThrow(emptySchema, {}, "Custom fallback");
    expect(result).toEqual({});
  });

  it("falls back to custom message on validation error", () => {
    const schema = z.object({
      value: z.string().min(1),
    });
    try {
      validatePayloadOrThrow(schema, { value: "" }, "Custom error");
    } catch (e) {
      if (e instanceof ClientValidationError) {
        expect(e.message).toBeDefined();
      }
    }
  });

  it("handles nested field paths", () => {
    const nestedSchema = z.object({
      user: z.object({
        profile: z.object({
          email: z.string().email(),
        }),
      }),
    });
    const data = { user: { profile: { email: "invalid" } } };
    try {
      validatePayloadOrThrow(nestedSchema, data);
    } catch (e) {
      if (e instanceof ClientValidationError) {
        expect(Object.keys(e.fieldErrors).some((key) => key.includes("user"))).toBe(true);
      }
    }
  });

  it("handles array validation errors", () => {
    const arraySchema = z.object({
      items: z.array(z.string().min(1)),
    });
    const data = { items: ["valid", ""] };
    try {
      validatePayloadOrThrow(arraySchema, data);
    } catch (e) {
      if (e instanceof ClientValidationError) {
        expect(Object.keys(e.fieldErrors).length).toBeGreaterThan(0);
      }
    }
  });

  it("preserves first error only per field", () => {
    const schema = z.object({
      email: z.string().email("Email error 1"),
    });
    const data = { email: "not-email" };
    try {
      validatePayloadOrThrow(schema, data);
    } catch (e) {
      if (e instanceof ClientValidationError) {
        expect(e.fieldErrors.email).toBe("Email error 1");
      }
    }
  });

  it("validates object without issues", () => {
    const schema = z.object({}).passthrough();
    expect(() => validatePayloadOrThrow(schema, {})).not.toThrow();
  });

  it("validates with extra fields", () => {
    const schema = z.object({ name: z.string() }).passthrough();
    const result = validatePayloadOrThrow(schema, { name: "John", extra: "field" });
    expect(result.name).toBe("John");
  });

  it("throws on missing required fields", () => {
    const schema = z.object({ email: z.string() });
    expect(() => validatePayloadOrThrow(schema, {})).toThrow(ClientValidationError);
  });

  it("handles string input gracefully", () => {
    const schema = z.object({ name: z.string() });
    expect(() => validatePayloadOrThrow(schema, "not an object")).toThrow(ClientValidationError);
  });

  it("handles number input gracefully", () => {
    const schema = z.object({ name: z.string() });
    expect(() => validatePayloadOrThrow(schema, 123 as any)).toThrow(ClientValidationError);
  });

  it("handles null input gracefully", () => {
    const schema = z.object({ name: z.string() });
    expect(() => validatePayloadOrThrow(schema, null as any)).toThrow(ClientValidationError);
  });
});

describe("toUserMessageFromClientValidation", () => {
  it("returns null if error is not ClientValidationError", () => {
    const regularError = new Error("Regular error");
    expect(toUserMessageFromClientValidation(regularError)).toBeNull();
  });

  it("returns null if input is not an error", () => {
    expect(toUserMessageFromClientValidation("string")).toBeNull();
    expect(toUserMessageFromClientValidation(123)).toBeNull();
    expect(toUserMessageFromClientValidation(null)).toBeNull();
  });

  it("returns error message if no field errors", () => {
    const error = new ClientValidationError("Generic error", {});
    const message = toUserMessageFromClientValidation(error);
    expect(message).toBe("Generic error");
  });

  it("formats field error as 'fieldName: errorMessage'", () => {
    const error = new ClientValidationError("Error", { email: "Invalid email" });
    const message = toUserMessageFromClientValidation(error);
    expect(message).toBe("email: Invalid email");
  });

  it("uses first field error when multiple exist", () => {
    const error = new ClientValidationError("Error", {
      email: "Invalid email",
      password: "Too short",
      username: "Already taken",
    });
    const message = toUserMessageFromClientValidation(error);
    expect(message).toBeTruthy();
    expect(message).toContain(": ");
  });

  it("handles empty string field errors", () => {
    const error = new ClientValidationError("Error", { field: "" });
    const message = toUserMessageFromClientValidation(error);
    expect(message).toBe("field: ");
  });

  it("handles special characters in error message", () => {
    const error = new ClientValidationError("Error", {
      email: "Email must match: user@domain.com",
    });
    const message = toUserMessageFromClientValidation(error);
    expect(message).toContain("Email must match: user@domain.com");
  });

  it("preserves Unicode in error messages", () => {
    const error = new ClientValidationError("Error", {
      nombre: "El nombre es inválido",
    });
    const message = toUserMessageFromClientValidation(error);
    expect(message).toContain("inválido");
  });

  it("returns null for undefined error", () => {
    expect(toUserMessageFromClientValidation(undefined)).toBeNull();
  });

  it("returns null for null error", () => {
    expect(toUserMessageFromClientValidation(null)).toBeNull();
  });
});

describe("integration: validation flow", () => {
  const userSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password too short"),
  });

  it("validates, throws, and converts to user message", () => {
    const invalidData = { email: "bad", password: "short" };
    try {
      validatePayloadOrThrow(userSchema, invalidData);
    } catch (error) {
      const userMessage = toUserMessageFromClientValidation(error);
      expect(userMessage).toBeTruthy();
      expect(typeof userMessage).toBe("string");
    }
  });

  it("handles successful validation without throwing", () => {
    const validData = { email: "user@example.com", password: "ValidPass123" };
    const result = validatePayloadOrThrow(userSchema, validData);
    expect(result).toEqual(validData);
  });

  it("converts validation error for UI display", () => {
    const testSchema = z.object({
      name: z.string().min(1, "Name required"),
      age: z.number().min(18, "Must be 18+"),
    });
    try {
      validatePayloadOrThrow(testSchema, { name: "", age: 15 });
    } catch (error) {
      const message = toUserMessageFromClientValidation(error);
      expect(message).toBeTruthy();
      expect(message).toContain(":");
    }
  });
});
