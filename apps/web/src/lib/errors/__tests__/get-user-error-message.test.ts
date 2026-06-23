import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserErrorMessage } from "../get-user-error-message";
import { ApiError } from "../api-error";
import { ErrorCode } from "../error-codes";

describe("getUserErrorMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("with ApiError instance", () => {
    it("should return context-specific message when available", () => {
      const error = new ApiError(409, ErrorCode.COMPANY_ALREADY_EXISTS, "Company exists");
      const result = getUserErrorMessage(error, "companies.create");

      expect(result.title).toBe("La empresa ya existe");
      expect(result.description).toContain("Ya hay una empresa registrada");
      expect(result.severity).toBe("error");
    });

    it("should return global message when context is not provided", () => {
      const error = new ApiError(401, ErrorCode.AUTH_SESSION_EXPIRED, "Session expired");
      const result = getUserErrorMessage(error);

      expect(result.title).toBe("Tu sesión ha expirado");
      expect(result.description).toContain("inicia sesión nuevamente");
      expect(result.actionLabel).toBe("Iniciar sesión");
    });

    it("should fall back to context fallback message", () => {
      const error = new ApiError(500, "UNKNOWN_CODE", "Unknown error");
      const result = getUserErrorMessage(error, "companies.create");

      expect(result.title).toBe("No fue posible crear la empresa");
      expect(result.severity).toBe("error");
    });

    it("should use context-specific message over global message", () => {
      const error = new ApiError(400, ErrorCode.VALIDATION_ERROR, "Invalid data");
      const result = getUserErrorMessage(error, "tickets.create");

      expect(result.title).toBe("Datos inválidos");
    });

    it("should include default actionLabel when not specified", () => {
      const error = new ApiError(401, ErrorCode.ACCESS_DENIED, "Access denied");
      const result = getUserErrorMessage(error);

      expect(result.actionLabel).toBe("Reintentar");
    });

    it("should handle multiple error codes", () => {
      const errors = [
        { code: ErrorCode.AUTH_SESSION_EXPIRED, expectedTitle: "Tu sesión ha expirado" },
        { code: ErrorCode.NETWORK_ERROR, expectedTitle: "Sin conexión" },
        { code: ErrorCode.DATABASE_CONSTRAINT_ERROR, expectedTitle: "Registro duplicado" },
      ];

      errors.forEach(({ code, expectedTitle }) => {
        const error = new ApiError(400, code, "error");
        const result = getUserErrorMessage(error);
        expect(result.title).toBe(expectedTitle);
      });
    });
  });

  describe("with Error instance", () => {
    it("should convert Error to ApiError with 500 status", () => {
      const error = new Error("Something went wrong");
      const result = getUserErrorMessage(error);

      expect(result.title).toContain("error");
      expect(result.severity).toBe("error");
    });

    it("should preserve error message when converting Error", () => {
      const error = new Error("Custom error message");
      const result = getUserErrorMessage(error);

      expect(result.description).toContain("Custom error message");
    });

    it("should handle empty Error message", () => {
      const error = new Error("");
      const result = getUserErrorMessage(error);

      expect(result.severity).toBe("error");
    });
  });

  describe("with string error", () => {
    it("should convert string to ApiError", () => {
      const result = getUserErrorMessage("Error string");

      expect(result.severity).toBe("error");
      expect(result.description).toContain("Error string");
    });

    it("should handle empty string", () => {
      const result = getUserErrorMessage("");

      expect(result.severity).toBe("error");
    });
  });

  describe("with unknown error type", () => {
    it("should handle null", () => {
      const result = getUserErrorMessage(null);

      expect(result.severity).toBe("error");
      expect(result.title).toBe("Ocurrió un error inesperado");
    });

    it("should handle undefined", () => {
      const result = getUserErrorMessage(undefined);

      expect(result.severity).toBe("error");
      expect(result.title).toBe("Ocurrió un error inesperado");
    });

    it("should handle plain object", () => {
      const result = getUserErrorMessage({ message: "Some error" });

      expect(result.severity).toBe("error");
    });

    it("should handle number", () => {
      const result = getUserErrorMessage(404);

      expect(result.severity).toBe("error");
    });

    it("should handle boolean", () => {
      const result = getUserErrorMessage(true);

      expect(result.severity).toBe("error");
    });
  });

  describe("context-specific messages", () => {
    it("should handle auth.login context", () => {
      const error = new ApiError(400, ErrorCode.AUTH_INVALID_CREDENTIALS, "Invalid credentials");
      const result = getUserErrorMessage(error, "auth.login");

      expect(result.title).toBe("Credenciales incorrectas");
      expect(result.description).toContain("correo o la contraseña");
    });

    it("should handle tickets.create context", () => {
      const error = new ApiError(400, ErrorCode.VEHICLE_PLATE_REQUIRED, "Plate required");
      const result = getUserErrorMessage(error, "tickets.create");

      expect(result.title).toBe("Placa requerida");
      expect(result.description).toContain("placa válida");
    });

    it("should handle print-agent context", () => {
      const error = new ApiError(500, ErrorCode.PRINT_AGENT_UNAVAILABLE, "Agent unavailable");
      const result = getUserErrorMessage(error, "print-agent");

      expect(result.title).toBe("Impresora no disponible");
    });

    it("should fallback to global message for unknown error code in context", () => {
      const error = new ApiError(500, "RANDOM_CODE", "Some error");
      const result = getUserErrorMessage(error, "companies.load");

      expect(result.title).toBe("No fue posible cargar las empresas");
    });

    it("should handle missing context gracefully", () => {
      const error = new ApiError(400, ErrorCode.VALIDATION_ERROR, "Validation failed");
      const result = getUserErrorMessage(error, "non.existent.context");

      expect(result.severity).toBe("error");
      expect(result.title).toBeTruthy();
      // Falls back to default message for missing context
      expect(["Ocurrió un error inesperado", "Datos inválidos"]).toContain(result.title);
    });
  });

  describe("default fallback behavior", () => {
    it("should provide default message when nothing matches", () => {
      const error = new ApiError(999, "COMPLETELY_UNKNOWN", "Unknown");
      const result = getUserErrorMessage(error, "unknown.context");

      expect(result.title).toBe("Ocurrió un error inesperado");
      expect(result.actionLabel).toBe("Reintentar");
      expect(result.severity).toBe("error");
    });

    it("should have all required fields in default fallback", () => {
      const error = new ApiError(999, "UNKNOWN", "error");
      const result = getUserErrorMessage(error);

      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("actionLabel");
      expect(result).toHaveProperty("severity");
    });
  });

  describe("edge cases", () => {
    it("should handle ApiError with null message", () => {
      const error = new ApiError(500, ErrorCode.UNKNOWN_ERROR, "");
      const result = getUserErrorMessage(error);

      expect(result.severity).toBe("error");
    });

    it("should handle Error with very long message", () => {
      const longMessage = "a".repeat(10000);
      const error = new Error(longMessage);
      const result = getUserErrorMessage(error);

      expect(result.description).toContain(longMessage);
    });

    it("should preserve severity when provided", () => {
      const error = new ApiError(401, ErrorCode.AUTH_SESSION_EXPIRED, "Session expired");
      const result = getUserErrorMessage(error);

      expect(result.severity).toBe("error");
    });

    it("should handle context with no matching global messages", () => {
      const error = new ApiError(500, "CUSTOM_CODE", "Custom error");
      const result = getUserErrorMessage(error, "companies.load");

      expect(result.title).toBe("No fue posible cargar las empresas");
    });
  });

  describe("special characters and localization", () => {
    it("should preserve special characters in error messages", () => {
      const error = new Error("Error: usuario@empresa.com no válido");
      const result = getUserErrorMessage(error);

      expect(result.description).toContain("@");
      expect(result.description).toContain("usuario");
    });

    it("should handle accented characters", () => {
      const error = new Error("Fué un error inesperado");
      const result = getUserErrorMessage(error);

      expect(result.description).toContain("inesperado");
    });

    it("should handle unicode characters", () => {
      const error = new Error("错误: 无效的用户名");
      const result = getUserErrorMessage(error);

      expect(result.severity).toBe("error");
    });
  });

  describe("message composition", () => {
    it("should correctly compose global error messages with defaults", () => {
      const error = new ApiError(403, ErrorCode.ACCESS_DENIED, "Access denied");
      const result = getUserErrorMessage(error);

      expect(result.title).toBe("Acceso denegado");
      expect(result.description).toContain("permisos");
      expect(result.actionLabel).toBe("Reintentar");
      expect(result.severity).toBe("error");
    });

    it("should correctly compose context-specific messages", () => {
      const error = new ApiError(400, ErrorCode.USER_EMAIL_ALREADY_EXISTS, "Email exists");
      const result = getUserErrorMessage(error, "companies.create");

      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("description");
      expect(result.severity).toBe("error");
    });
  });
});
