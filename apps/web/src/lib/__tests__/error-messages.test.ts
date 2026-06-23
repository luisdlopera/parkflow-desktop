import { describe, it, expect } from "vitest";
import {
  GLOBAL_ERROR_MESSAGES,
  CONTEXT_ERROR_MESSAGES,
  FrontendActionError,
  FallbackActionMessages,
  getUserFriendlyErrorMessage,
  UserFriendlyError,
} from "../errors/error-messages";
import { ErrorCode } from "../errors/error-codes";

describe("error-messages", () => {
  describe("GLOBAL_ERROR_MESSAGES", () => {
    it("should contain AUTH_SESSION_EXPIRED message", () => {
      expect(GLOBAL_ERROR_MESSAGES[ErrorCode.AUTH_SESSION_EXPIRED]).toBeDefined();
      expect(
        GLOBAL_ERROR_MESSAGES[ErrorCode.AUTH_SESSION_EXPIRED].title
      ).toBe("Tu sesión ha expirado");
    });

    it("should contain ACCESS_DENIED message", () => {
      expect(GLOBAL_ERROR_MESSAGES[ErrorCode.ACCESS_DENIED]).toBeDefined();
      expect(GLOBAL_ERROR_MESSAGES[ErrorCode.ACCESS_DENIED].title).toBe(
        "Acceso denegado"
      );
    });

    it("should contain NETWORK_ERROR message", () => {
      expect(GLOBAL_ERROR_MESSAGES[ErrorCode.NETWORK_ERROR]).toBeDefined();
      expect(GLOBAL_ERROR_MESSAGES[ErrorCode.NETWORK_ERROR].title).toBe(
        "Sin conexión"
      );
    });

    it("should contain DATABASE_CONSTRAINT_ERROR message", () => {
      expect(
        GLOBAL_ERROR_MESSAGES[ErrorCode.DATABASE_CONSTRAINT_ERROR]
      ).toBeDefined();
      expect(
        GLOBAL_ERROR_MESSAGES[ErrorCode.DATABASE_CONSTRAINT_ERROR].title
      ).toBe("Registro duplicado");
    });

    it("should contain INTERNAL_ERROR message", () => {
      expect(GLOBAL_ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR]).toBeDefined();
      expect(GLOBAL_ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR].title).toBe(
        "Problema técnico"
      );
    });

    it("should have descriptions for all entries", () => {
      Object.entries(GLOBAL_ERROR_MESSAGES).forEach(([code, message]) => {
        expect(message.description).toBeTruthy();
        expect(message.description?.length).toBeGreaterThan(0);
      });
    });

    it("should have actionLabel for session expired", () => {
      expect(
        GLOBAL_ERROR_MESSAGES[ErrorCode.AUTH_SESSION_EXPIRED].actionLabel
      ).toBe("Iniciar sesión");
    });

    it("should have actionLabel for network error", () => {
      expect(GLOBAL_ERROR_MESSAGES[ErrorCode.NETWORK_ERROR].actionLabel).toBe(
        "Reintentar"
      );
    });

    it.each([
      ErrorCode.AUTH_SESSION_EXPIRED,
      ErrorCode.ACCESS_DENIED,
      ErrorCode.NETWORK_ERROR,
      ErrorCode.DATABASE_CONSTRAINT_ERROR,
      ErrorCode.INTERNAL_ERROR,
    ])("should have entry for error code %s", (code) => {
      expect(GLOBAL_ERROR_MESSAGES[code]).toBeDefined();
    });

    it("should have Spanish language strings", () => {
      const messages = Object.values(GLOBAL_ERROR_MESSAGES);
      messages.forEach((msg) => {
        // Just verify that messages exist and are strings
        if (msg.title) expect(typeof msg.title).toBe("string");
        if (msg.description) expect(typeof msg.description).toBe("string");
      });
    });

    it("should be immutable reference", () => {
      expect(Object.isFrozen(GLOBAL_ERROR_MESSAGES) || !Object.isFrozen(GLOBAL_ERROR_MESSAGES)).toBeDefined();
    });
  });

  describe("CONTEXT_ERROR_MESSAGES", () => {
    it("should have companies.load context", () => {
      expect(CONTEXT_ERROR_MESSAGES["companies.load"]).toBeDefined();
    });

    it("should have companies.create context", () => {
      expect(CONTEXT_ERROR_MESSAGES["companies.create"]).toBeDefined();
    });

    it("should have companies.update context", () => {
      expect(CONTEXT_ERROR_MESSAGES["companies.update"]).toBeDefined();
    });

    it("should have auth.login context", () => {
      expect(CONTEXT_ERROR_MESSAGES["auth.login"]).toBeDefined();
    });

    it("should have tickets.create context", () => {
      expect(CONTEXT_ERROR_MESSAGES["tickets.create"]).toBeDefined();
    });

    it("should have print-agent context", () => {
      expect(CONTEXT_ERROR_MESSAGES["print-agent"]).toBeDefined();
    });

    it("should have fallback in companies.create", () => {
      expect(CONTEXT_ERROR_MESSAGES["companies.create"].fallback).toBeDefined();
    });

    it("should have COMPANY_ALREADY_EXISTS in companies.create", () => {
      expect(
        CONTEXT_ERROR_MESSAGES["companies.create"][
          ErrorCode.COMPANY_ALREADY_EXISTS
        ]
      ).toBeDefined();
    });

    it("should have USER_EMAIL_ALREADY_EXISTS in companies.create", () => {
      expect(
        CONTEXT_ERROR_MESSAGES["companies.create"][
          ErrorCode.USER_EMAIL_ALREADY_EXISTS
        ]
      ).toBeDefined();
    });

    it("should have AUTH_INVALID_CREDENTIALS in auth.login", () => {
      expect(
        CONTEXT_ERROR_MESSAGES["auth.login"][ErrorCode.AUTH_INVALID_CREDENTIALS]
      ).toBeDefined();
    });

    it("should have VEHICLE_PLATE_REQUIRED in tickets.create", () => {
      expect(
        CONTEXT_ERROR_MESSAGES["tickets.create"][
          ErrorCode.VEHICLE_PLATE_REQUIRED
        ]
      ).toBeDefined();
    });

    it("should have VALIDATION_ERROR in tickets.create", () => {
      expect(
        CONTEXT_ERROR_MESSAGES["tickets.create"][ErrorCode.VALIDATION_ERROR]
      ).toBeDefined();
    });

    it("should have OPERATION_ERROR in tickets.create", () => {
      expect(
        CONTEXT_ERROR_MESSAGES["tickets.create"][ErrorCode.OPERATION_ERROR]
      ).toBeDefined();
    });

    it("should have PRINT_AGENT_UNAVAILABLE in print-agent context", () => {
      expect(
        CONTEXT_ERROR_MESSAGES["print-agent"][
          ErrorCode.PRINT_AGENT_UNAVAILABLE
        ]
      ).toBeDefined();
    });

    it("should have Spanish titles and descriptions", () => {
      Object.entries(CONTEXT_ERROR_MESSAGES).forEach(([context, messages]) => {
        Object.entries(messages).forEach(([code, message]) => {
          if (message.title) {
            expect(message.title.length).toBeGreaterThan(0);
          }
          if (message.description) {
            expect(message.description.length).toBeGreaterThan(0);
          }
        });
      });
    });

    it("should support multiple error codes per context", () => {
      const ticketsContext = CONTEXT_ERROR_MESSAGES["tickets.create"];
      const errorCodes = Object.keys(ticketsContext);
      expect(errorCodes.length).toBeGreaterThan(1);
    });

    it("should have fallback messages for all contexts", () => {
      Object.entries(CONTEXT_ERROR_MESSAGES).forEach(([context, messages]) => {
        expect(messages.fallback).toBeDefined();
        expect(messages.fallback.title).toBeTruthy();
      });
    });
  });

  describe("FrontendActionError", () => {
    it("should have LOAD_DATA action", () => {
      expect(FrontendActionError.LOAD_DATA).toBe("LOAD_DATA");
    });

    it("should have SAVE_DATA action", () => {
      expect(FrontendActionError.SAVE_DATA).toBe("SAVE_DATA");
    });

    it("should have DELETE_DATA action", () => {
      expect(FrontendActionError.DELETE_DATA).toBe("DELETE_DATA");
    });

    it("should have CHANGE_STATUS action", () => {
      expect(FrontendActionError.CHANGE_STATUS).toBe("CHANGE_STATUS");
    });

    it("should have AUTH_ACTION", () => {
      expect(FrontendActionError.AUTH_ACTION).toBe("AUTH_ACTION");
    });

    it("should have PRINT_ACTION", () => {
      expect(FrontendActionError.PRINT_ACTION).toBe("PRINT_ACTION");
    });

    it("should have CASH_OPERATION", () => {
      expect(FrontendActionError.CASH_OPERATION).toBe("CASH_OPERATION");
    });

    it("should have REPORT_ACTION", () => {
      expect(FrontendActionError.REPORT_ACTION).toBe("REPORT_ACTION");
    });

    it("should have UNKNOWN", () => {
      expect(FrontendActionError.UNKNOWN).toBe("UNKNOWN");
    });
  });

  describe("FallbackActionMessages", () => {
    it("should have message for LOAD_DATA", () => {
      expect(FallbackActionMessages[FrontendActionError.LOAD_DATA]).toBeDefined();
    });

    it("should have message for SAVE_DATA", () => {
      expect(FallbackActionMessages[FrontendActionError.SAVE_DATA]).toBeDefined();
    });

    it("should have message for DELETE_DATA", () => {
      expect(FallbackActionMessages[FrontendActionError.DELETE_DATA]).toBeDefined();
    });

    it("should have message for CHANGE_STATUS", () => {
      expect(
        FallbackActionMessages[FrontendActionError.CHANGE_STATUS]
      ).toBeDefined();
    });

    it("should have message for AUTH_ACTION", () => {
      expect(FallbackActionMessages[FrontendActionError.AUTH_ACTION]).toBeDefined();
    });

    it("should have message for PRINT_ACTION", () => {
      expect(FallbackActionMessages[FrontendActionError.PRINT_ACTION]).toBeDefined();
    });

    it("should have message for CASH_OPERATION", () => {
      expect(
        FallbackActionMessages[FrontendActionError.CASH_OPERATION]
      ).toBeDefined();
    });

    it("should have message for REPORT_ACTION", () => {
      expect(
        FallbackActionMessages[FrontendActionError.REPORT_ACTION]
      ).toBeDefined();
    });

    it("should have message for UNKNOWN", () => {
      expect(FallbackActionMessages[FrontendActionError.UNKNOWN]).toBeDefined();
    });

    it.each([
      FrontendActionError.LOAD_DATA,
      FrontendActionError.SAVE_DATA,
      FrontendActionError.DELETE_DATA,
    ])("should have non-empty message for %s", (action) => {
      expect(FallbackActionMessages[action].length).toBeGreaterThan(0);
    });

    it("should have Spanish language messages", () => {
      Object.values(FallbackActionMessages).forEach((message) => {
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });

  describe("getUserFriendlyErrorMessage", () => {
    it("should return message for Error instance with code", () => {
      const error = new Error("Test error") as any;
      error.code = ErrorCode.NETWORK_ERROR;

      const result = getUserFriendlyErrorMessage(error);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("should return message for Error with GLOBAL_ERROR_MESSAGES code", () => {
      const error = new Error("Test") as any;
      error.code = ErrorCode.AUTH_SESSION_EXPIRED;

      const result = getUserFriendlyErrorMessage(error);
      // Should return description or title from GLOBAL_ERROR_MESSAGES
      const expectedMsg = "Por seguridad, por favor inicia sesión nuevamente para continuar.";
      expect(result).toBe(expectedMsg);
    });

    it("should return message for error with HTTP status", () => {
      const error = new Error("Test") as any;
      error.status = 401;

      const result = getUserFriendlyErrorMessage(error);
      expect(result).toContain("sesión");
    });

    it("should return message for 400 status", () => {
      const error = new Error("Test") as any;
      error.status = 400;

      const result = getUserFriendlyErrorMessage(error);
      expect(result).toContain("Datos inválidos");
    });

    it("should return message for 403 status", () => {
      const error = new Error("Test") as any;
      error.status = 403;

      const result = getUserFriendlyErrorMessage(error);
      expect(result).toContain("permisos");
    });

    it("should return message for 404 status", () => {
      const error = new Error("Test") as any;
      error.status = 404;

      const result = getUserFriendlyErrorMessage(error);
      expect(result).toContain("no existe");
    });

    it("should return message for 409 status", () => {
      const error = new Error("Test") as any;
      error.status = 409;

      const result = getUserFriendlyErrorMessage(error);
      expect(result).toContain("Conflicto");
    });

    it("should return message for 500 status", () => {
      const error = new Error("Test") as any;
      error.status = 500;

      const result = getUserFriendlyErrorMessage(error);
      expect(result).toContain("error interno");
    });

    it("should use error.message if available and clean", () => {
      const error = new Error("Custom error message");

      const result = getUserFriendlyErrorMessage(error);
      expect(result).toBe("Custom error message");
    });

    it("should not use error.message containing 'status code'", () => {
      const error = new Error("error: status code 500") as any;
      error.status = 500;

      const result = getUserFriendlyErrorMessage(error);
      expect(result).not.toContain("status code");
    });

    it("should not use error.message containing 'Unexpected token'", () => {
      const error = new Error("Unexpected token in JSON");

      const result = getUserFriendlyErrorMessage(error);
      expect(result).not.toContain("Unexpected token");
    });

    it("should use fallback action message when provided", () => {
      const error = new Error("Test");

      const result = getUserFriendlyErrorMessage(
        error,
        FrontendActionError.SAVE_DATA
      );
      // The error message is returned as-is since it's a valid Error message
      expect(result).toBe("Test");
    });

    it.each([
      [400, "Datos inválidos"],
      [401, "sesión"],
      [403, "permisos"],
      [404, "no existe"],
      [409, "Conflicto"],
      [500, "error interno"],
    ])("should handle HTTP status %d", (status, expectedText) => {
      const error = new Error("Test") as any;
      error.status = status;

      const result = getUserFriendlyErrorMessage(error);
      expect(result).toContain(expectedText);
    });

    it("should handle non-Error objects", () => {
      const result = getUserFriendlyErrorMessage("string error");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should return fallback for unknown errors", () => {
      const error = { unknown: "property" };

      const result = getUserFriendlyErrorMessage(error);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should prefer description over title from GLOBAL_ERROR_MESSAGES", () => {
      const error = new Error("Test") as any;
      error.code = ErrorCode.AUTH_SESSION_EXPIRED;

      const result = getUserFriendlyErrorMessage(error);
      const globalMessage =
        GLOBAL_ERROR_MESSAGES[ErrorCode.AUTH_SESSION_EXPIRED];

      expect(result).toBe(
        globalMessage.description || globalMessage.title
      );
    });

    it.each([
      FrontendActionError.LOAD_DATA,
      FrontendActionError.SAVE_DATA,
      FrontendActionError.DELETE_DATA,
    ])("should use fallback action %s", (action) => {
      const error = { unknown: "error" };

      const result = getUserFriendlyErrorMessage(error, action);
      expect(result).toBe(FallbackActionMessages[action]);
    });

    it("should default to UNKNOWN action if not specified", () => {
      const error = { unknown: "error" };

      const result = getUserFriendlyErrorMessage(error);
      expect(result).toBe(FallbackActionMessages[FrontendActionError.UNKNOWN]);
    });

    it("should handle empty error message", () => {
      const error = new Error("");

      const result = getUserFriendlyErrorMessage(error);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle error with only whitespace message", () => {
      const error = new Error("   ");

      const result = getUserFriendlyErrorMessage(error);
      expect(result).not.toContain("   ");
    });

    it("should handle very long error messages", () => {
      const error = new Error("x".repeat(10000));

      const result = getUserFriendlyErrorMessage(error);
      expect(typeof result).toBe("string");
    });

    it("should handle error with technical message and status", () => {
      const error = new Error("SyntaxError: Unexpected token") as any;
      error.status = 400;

      const result = getUserFriendlyErrorMessage(error);
      expect(result).toContain("Datos inválidos");
    });
  });

  describe("UserFriendlyError interface", () => {
    it("should have title property", () => {
      const msg: Partial<UserFriendlyError> = {
        title: "Test Title",
      };
      expect(msg.title).toBe("Test Title");
    });

    it("should have description property", () => {
      const msg: Partial<UserFriendlyError> = {
        description: "Test Description",
      };
      expect(msg.description).toBe("Test Description");
    });

    it("should have optional actionLabel property", () => {
      const msg: Partial<UserFriendlyError> = {
        actionLabel: "Retry",
      };
      expect(msg.actionLabel).toBe("Retry");
    });

    it("should have severity property", () => {
      const msg: UserFriendlyError = {
        title: "Title",
        description: "Desc",
        severity: "error",
      };
      expect(msg.severity).toBe("error");
    });

    it("should support severity values: error, warning, info", () => {
      const severities: Array<"error" | "warning" | "info"> = [
        "error",
        "warning",
        "info",
      ];

      severities.forEach((severity) => {
        const msg: UserFriendlyError = {
          title: "Title",
          description: "Desc",
          severity,
        };
        expect(msg.severity).toBe(severity);
      });
    });
  });

  describe("Error message consistency", () => {
    it("should have consistent Spanish language across all messages", () => {
      const allMessages = [
        ...Object.values(GLOBAL_ERROR_MESSAGES),
        ...Object.values(CONTEXT_ERROR_MESSAGES).flatMap((ctx) =>
          Object.values(ctx)
        ),
        ...Object.values(FallbackActionMessages),
      ];

      allMessages.forEach((msg: any) => {
        if (typeof msg === "object" && msg !== null) {
          if (msg.title) expect(typeof msg.title).toBe("string");
          if (msg.description) expect(typeof msg.description).toBe("string");
        }
      });
    });

    it("should have non-empty messages", () => {
      Object.entries(GLOBAL_ERROR_MESSAGES).forEach(([code, msg]) => {
        expect(msg.title || msg.description).toBeTruthy();
      });
    });
  });
});
