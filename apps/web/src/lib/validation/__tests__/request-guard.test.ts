import { validatePayloadOrThrow, toUserMessageFromClientValidation, ClientValidationError } from "@/lib/validation/request-guard";
import { z } from "zod";

const testSchema = z.object({
  ticketNumber: z.string().min(1, "Ticket requerido"),
  amount: z.number().positive("Monto debe ser positivo"),
});

describe("validatePayloadOrThrow", () => {
  it("returns parsed payload for valid data", () => {
    const result = validatePayloadOrThrow(testSchema, { ticketNumber: "T-1", amount: 5000 });
    expect(result).toEqual({ ticketNumber: "T-1", amount: 5000 });
  });

  it("throws ZodError for invalid data", () => {
    expect(() => validatePayloadOrThrow(testSchema, { ticketNumber: "", amount: -1 })).toThrow();
  });

  it("transforms data through schema refinements", () => {
    const schema = z.object({
      plate: z.string().transform((v) => v.toUpperCase()),
    });
    const result = validatePayloadOrThrow(schema, { plate: "abc123" });
    expect(result.plate).toBe("ABC123");
  });
});

describe("toUserMessageFromClientValidation", () => {
  it("returns null for non-ZodError", () => {
    const result = toUserMessageFromClientValidation(new Error("Generic error"));
    expect(result).toBeNull();
  });

  it("returns user message for ZodError", () => {
    try {
      testSchema.parse({ ticketNumber: "", amount: -1 });
    } catch (err) {
      const result = toUserMessageFromClientValidation(new ClientValidationError("Validation failed", { ticketNumber: "Ticket requerido" }));
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    }
  });

  it("returns null for non-errors", () => {
    expect(toUserMessageFromClientValidation("string")).toBeNull();
    expect(toUserMessageFromClientValidation(null)).toBeNull();
  });
});
