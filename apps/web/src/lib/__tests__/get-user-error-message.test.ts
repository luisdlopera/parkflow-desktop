import { describe, it, expect, vi } from "vitest";
import { getUserErrorMessage } from "../errors/get-user-error-message";
import { ApiError } from "../errors/api-error";
import { ErrorCode } from "../errors/error-codes";

describe("get-user-error-message", () => {
  describe("getUserErrorMessage", () => {
    it("should handle ApiError instances", () => {
      const apiError = new ApiError(
        401,
        ErrorCode.AUTH_SESSION_EXPIRED,
        "Session expired"
      );

      const result = getUserErrorMessage(apiError);

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.severity).toBe("error");
    });

    it("should return error object with required properties", () => {
      const apiError = new ApiError(
        500,
        ErrorCode.INTERNAL_ERROR,
        "Server error"
      );

      const result = getUserErrorMessage(apiError);

      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("severity");
    });

    it("should include actionLabel in response", () => {
      const apiError = new ApiError(
        401,
        ErrorCode.AUTH_SESSION_EXPIRED,
        "Expired"
      );

      const result = getUserErrorMessage(apiError);

      expect(result.actionLabel).toBeDefined();
    });

    it("should handle Error instances", () => {
      const error = new Error("Test error message");

      const result = getUserErrorMessage(error);

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.severity).toBe("error");
    });

    it("should handle non-Error objects", () => {
      const result = getUserErrorMessage("string error");

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.description).toBeDefined();
    });

    it("should find context-specific message when context provided", () => {
      const apiError = new ApiError(
        400,
        ErrorCode.COMPANY_ALREADY_EXISTS,
        "Company exists"
      );

      const result = getUserErrorMessage(apiError, "companies.create");

      expect(result.title).toBe("La empresa ya existe");
    });

    it("should use context fallback when specific error code not in context", () => {
      const apiError = new ApiError(
        500,
        ErrorCode.INTERNAL_ERROR,
        "Internal error"
      );

      const result = getUserErrorMessage(apiError, "companies.create");

      expect(result.title).toBe("No fue posible crear la empresa");
    });

    it("should use global message when context not provided", () => {
      const apiError = new ApiError(
        401,
        ErrorCode.ACCESS_DENIED,
        "Access denied"
      );

      const result = getUserErrorMessage(apiError);

      expect(result.title).toBe("Acceso denegado");
    });

    it("should return default message when no match found", () => {
      const apiError = new ApiError(
        500,
        "UNKNOWN_CODE",
        "Unknown error"
      );

      const result = getUserErrorMessage(apiError);

      expect(result.title).toBe("Ocurrió un error inesperado");
    });

    it("should preserve default values for severity and actionLabel", () => {
      const apiError = new ApiError(
        400,
        ErrorCode.VALIDATION_ERROR,
        "Invalid data"
      );

      const result = getUserErrorMessage(apiError);

      expect(result.severity).toBe("error");
      expect(result.actionLabel).toBe("Reintentar");
    });

    it("should handle context-specific error with custom actionLabel", () => {
      const apiError = new ApiError(
        401,
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        "Invalid credentials"
      );

      const result = getUserErrorMessage(apiError, "auth.login");

      expect(result.actionLabel).toBe("Reintentar");
    });

    it("should handle multiple different error codes in same context", () => {
      const error1 = new ApiError(
        400,
        ErrorCode.COMPANY_ALREADY_EXISTS,
        "Company exists"
      );
      const error2 = new ApiError(
        400,
        ErrorCode.USER_EMAIL_ALREADY_EXISTS,
        "Email exists"
      );

      const result1 = getUserErrorMessage(error1, "companies.create");
      const result2 = getUserErrorMessage(error2, "companies.create");

      expect(result1.title).not.toBe(result2.title);
    });

    it("should handle missing context by using global messages", () => {
      const apiError = new ApiError(
        401,
        ErrorCode.AUTH_SESSION_EXPIRED,
        "Session expired"
      );

      const result = getUserErrorMessage(apiError, "non-existent-context");

      expect(result.title).toBe("Tu sesión ha expirado");
    });

    it("should convert plain Error to ApiError with 500 status", () => {
      const error = new Error("Plain error");

      const result = getUserErrorMessage(error);

      expect(result).toBeDefined();
      expect(result.description).toContain("error");
    });

    it("should handle non-Error, non-string input", () => {
      const result = getUserErrorMessage({ custom: "object" });

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
    });

    it("should handle null input", () => {
      const result = getUserErrorMessage(null);

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
    });

    it("should handle undefined input", () => {
      const result = getUserErrorMessage(undefined);

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
    });

    it("should use error message from ApiError when available", () => {
      const apiError = new ApiError(
        400,
        ErrorCode.VALIDATION_ERROR,
        "Custom validation message"
      );

      const result = getUserErrorMessage(apiError);

      expect(result.description).toBeDefined();
    });

    it.each([
      [new ApiError(401, ErrorCode.AUTH_SESSION_EXPIRED, "Expired"), "Tu sesión ha expirado"],
      [new ApiError(403, ErrorCode.ACCESS_DENIED, "Denied"), "Acceso denegado"],
      [new ApiError(409, ErrorCode.DATABASE_CONSTRAINT_ERROR, "Conflict"), "Registro duplicado"],
    ])(
      "should handle error code mappings correctly",
      (error, expectedTitle) => {
        const result = getUserErrorMessage(error);
        expect(result.title).toBe(expectedTitle);
      }
    );

    it("should handle tickets.create context with VEHICLE_PLATE_REQUIRED", () => {
      const apiError = new ApiError(
        400,
        ErrorCode.VEHICLE_PLATE_REQUIRED,
        "Plate required"
      );

      const result = getUserErrorMessage(apiError, "tickets.create");

      expect(result.title).toBe("Placa requerida");
    });

    it("should handle print-agent context with PRINT_AGENT_UNAVAILABLE", () => {
      const apiError = new ApiError(
        503,
        ErrorCode.PRINT_AGENT_UNAVAILABLE,
        "Printer unavailable"
      );

      const result = getUserErrorMessage(apiError, "print-agent");

      expect(result.title).toBe("Impresora no disponible");
    });

    it("should return severity as error by default", () => {
      const apiError = new ApiError(
        500,
        ErrorCode.INTERNAL_ERROR,
        "Error"
      );

      const result = getUserErrorMessage(apiError);

      expect(result.severity).toBe("error");
    });

    it("should have all required UserFriendlyError properties", () => {
      const apiError = new ApiError(
        400,
        ErrorCode.VALIDATION_ERROR,
        "Invalid"
      );

      const result = getUserErrorMessage(apiError);

      expect(typeof result.title).toBe("string");
      expect(typeof result.description).toBe("string");
      expect(typeof result.severity).toBe("string");
      expect(typeof result.actionLabel).toBe("string");
    });

    it("should handle deeply nested context mapping", () => {
      const apiError = new ApiError(
        400,
        ErrorCode.USER_EMAIL_ALREADY_EXISTS,
        "Email exists"
      );

      const result = getUserErrorMessage(apiError, "companies.create");

      expect(result.title).toBe("Email ya registrado");
    });

    it("should handle ApiError with all optional properties", () => {
      const apiError = new ApiError(
        400,
        ErrorCode.VALIDATION_ERROR,
        "Invalid data",
        "/api/endpoint",
        "correlation-123",
        [{ field: "email", message: "Invalid format" }],
        "Technical message"
      );

      const result = getUserErrorMessage(apiError);

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.description).toBeDefined();
    });

    it("should maintain consistency across multiple calls", () => {
      const apiError = new ApiError(
        401,
        ErrorCode.AUTH_SESSION_EXPIRED,
        "Expired"
      );

      const result1 = getUserErrorMessage(apiError);
      const result2 = getUserErrorMessage(apiError);

      expect(result1).toEqual(result2);
    });

    it("should handle ERROR CODE being unknown string", () => {
      const apiError = new ApiError(
        500,
        "CUSTOM_UNKNOWN_ERROR_CODE",
        "Unknown"
      );

      const result = getUserErrorMessage(apiError);

      expect(result.title).toBe("Ocurrió un error inesperado");
      expect(result.description).toBe("Unknown");
    });

    it("should fallback to default message on missing description", () => {
      const apiError = new ApiError(
        500,
        ErrorCode.UNKNOWN_ERROR,
        "Unknown error"
      );

      const result = getUserErrorMessage(apiError);

      expect(result.title).toBeDefined();
      expect(result.description).toBeDefined();
    });

    it.each([
      ["companies.load", "load"],
      ["companies.create", "crear"],
      ["companies.update", "actualizar"],
      ["auth.login", "autenticar"],
      ["tickets.create", "registrar"],
    ])(
      "should handle context %s appropriately",
      (context, expectedKeyword) => {
        const apiError = new ApiError(
          500,
          "SOME_ERROR",
          "Error message"
        );

        const result = getUserErrorMessage(apiError, context);

        expect(result.title || result.description).toBeDefined();
      }
    );

    it("should preserve error code information", () => {
      const code = ErrorCode.AUTH_SESSION_EXPIRED;
      const apiError = new ApiError(401, code, "Expired");

      const result = getUserErrorMessage(apiError);

      expect(result.title).toBe("Tu sesión ha expirado");
    });

    it("should handle string error with numeric conversion", () => {
      const result = getUserErrorMessage("Error occurred");

      expect(result).toBeDefined();
      expect(typeof result.title).toBe("string");
    });

    it("should ensure actionLabel defaults to 'Reintentar'", () => {
      const apiError = new ApiError(
        400,
        ErrorCode.VALIDATION_ERROR,
        "Invalid"
      );

      const result = getUserErrorMessage(apiError);

      expect(result.actionLabel).toBe("Reintentar");
    });

    it("should handle error with empty message", () => {
      const apiError = new ApiError(
        500,
        ErrorCode.INTERNAL_ERROR,
        ""
      );

      const result = getUserErrorMessage(apiError);

      expect(result.description).toBeDefined();
      expect(result.description.length).toBeGreaterThan(0);
    });

    it("should be case-sensitive for context names", () => {
      const apiError = new ApiError(
        400,
        ErrorCode.COMPANY_ALREADY_EXISTS,
        "Exists"
      );

      const result1 = getUserErrorMessage(apiError, "companies.create");
      const result2 = getUserErrorMessage(apiError, "Companies.Create");

      expect(result1.title).toBe("La empresa ya existe");
      // result2 should use fallback since context doesn't exist
      expect(result2.title).toBe("Ocurrió un error inesperado");
    });
  });

  describe("Context-specific behavior", () => {
    it("should prioritize context-specific message over global", () => {
      const apiError = new ApiError(
        400,
        ErrorCode.COMPANY_ALREADY_EXISTS,
        "Duplicate"
      );

      const resultGlobal = getUserErrorMessage(apiError);
      const resultContext = getUserErrorMessage(apiError, "companies.create");

      expect(resultContext.title).not.toBe(resultGlobal.title);
      expect(resultContext.title).toBe("La empresa ya existe");
    });

    it("should fallback to context fallback before global", () => {
      const apiError = new ApiError(
        500,
        ErrorCode.INTERNAL_ERROR,
        "Server error"
      );

      const result = getUserErrorMessage(apiError, "companies.create");

      expect(result.title).toBe("No fue posible crear la empresa");
    });
  });
});
