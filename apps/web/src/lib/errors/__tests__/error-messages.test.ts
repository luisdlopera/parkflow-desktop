import {
  GLOBAL_ERROR_MESSAGES,
  CONTEXT_ERROR_MESSAGES,
  getUserFriendlyErrorMessage,
  FrontendActionError,
  FallbackActionMessages,
} from "../error-messages";
import { ErrorCode } from "../error-codes";
import { ApiError } from "../api-error";

describe("GLOBAL_ERROR_MESSAGES", () => {
  it("has expected keys", () => {
    expect(GLOBAL_ERROR_MESSAGES).toHaveProperty(ErrorCode.AUTH_SESSION_EXPIRED);
    expect(GLOBAL_ERROR_MESSAGES).toHaveProperty(ErrorCode.ACCESS_DENIED);
    expect(GLOBAL_ERROR_MESSAGES).toHaveProperty(ErrorCode.NETWORK_ERROR);
    expect(GLOBAL_ERROR_MESSAGES).toHaveProperty(ErrorCode.DATABASE_CONSTRAINT_ERROR);
    expect(GLOBAL_ERROR_MESSAGES).toHaveProperty(ErrorCode.INTERNAL_ERROR);
  });

  it("each entry has title and description", () => {
    for (const [key, entry] of Object.entries(GLOBAL_ERROR_MESSAGES)) {
      expect(entry.title).toBeDefined();
      expect(entry.description).toBeDefined();
      expect(typeof entry.title).toBe("string");
      expect(typeof entry.description).toBe("string");
    }
  });
});

describe("CONTEXT_ERROR_MESSAGES", () => {
  it("has expected contexts", () => {
    expect(CONTEXT_ERROR_MESSAGES).toHaveProperty("companies.load");
    expect(CONTEXT_ERROR_MESSAGES).toHaveProperty("companies.create");
    expect(CONTEXT_ERROR_MESSAGES).toHaveProperty("companies.update");
    expect(CONTEXT_ERROR_MESSAGES).toHaveProperty("auth.login");
    expect(CONTEXT_ERROR_MESSAGES).toHaveProperty("tickets.create");
    expect(CONTEXT_ERROR_MESSAGES).toHaveProperty("print-agent");
  });

  it("each context has a fallback entry", () => {
    for (const [context, messages] of Object.entries(CONTEXT_ERROR_MESSAGES)) {
      expect(messages).toHaveProperty("fallback");
      expect(messages.fallback.title).toBeDefined();
      expect(messages.fallback.description).toBeDefined();
    }
  });
});

describe("getUserFriendlyErrorMessage", () => {
  it("returns correct message for known error codes", () => {
    const error = new ApiError(
      401,
      ErrorCode.AUTH_SESSION_EXPIRED,
      "Unauthorized",
      "/api/test"
    );

    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBe(
      GLOBAL_ERROR_MESSAGES[ErrorCode.AUTH_SESSION_EXPIRED].description
    );
  });

  it("returns default message for unknown error codes", () => {
    const error = new ApiError(999, "UNKNOWN_CODE", "Request failed with status code 999", "/api/test");

    const message = getUserFriendlyErrorMessage(error, FrontendActionError.LOAD_DATA);
    expect(message).toBe(FallbackActionMessages[FrontendActionError.LOAD_DATA]);
  });

  it("respects fallbackAction for unknown errors without status", () => {
    const error = new ApiError(0, "WEIRD", "Request failed with status code 0", "/api/test");

    const message = getUserFriendlyErrorMessage(error, FrontendActionError.SAVE_DATA);
    expect(message).toBe(FallbackActionMessages[FrontendActionError.SAVE_DATA]);
  });

  it("returns HTTP-based message for 400 status", () => {
    const error = new ApiError(400, "VALIDATION_ERROR", "bad request", "/api/test");

    const message = getUserFriendlyErrorMessage(error);
    expect(message).toMatch(/Datos inválidos/);
  });

  it("returns HTTP-based message for 401 status without known code", () => {
    const error = new ApiError(401, "SOME_CODE", "bad auth", "/api/test");

    const message = getUserFriendlyErrorMessage(error);
    expect(message).toMatch(/sesión ha expirado/);
  });

  it("returns HTTP-based message for 403 status", () => {
    const error = new ApiError(403, "ACCESS_DENIED", "forbidden", "/api/test");

    const message = getUserFriendlyErrorMessage(error);
    expect(message).toMatch(/No tienes los permisos necesarios/);
  });

  it("returns HTTP-based message for 404 status", () => {
    const error = new ApiError(404, "NOT_FOUND", "not found", "/api/test");

    const message = getUserFriendlyErrorMessage(error);
    expect(message).toMatch(/El recurso solicitado no existe/);
  });

  it("returns HTTP-based message for 409 status", () => {
    const error = new ApiError(409, "CONFLICT", "conflict", "/api/test");

    const message = getUserFriendlyErrorMessage(error);
    expect(message).toMatch(/Conflicto/);
  });

  it("returns HTTP-based message for 500 status", () => {
    const error = new ApiError(500, "INTERNAL_ERROR", "server error", "/api/test");

    const message = getUserFriendlyErrorMessage(error);
    expect(message).toMatch(/error inesperado/);
  });

  it("uses error.message when no code or status match and message is user-friendly", () => {
    const error = new ApiError(0, "", "Mensaje amigable del usuario", "/api");

    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBe("Mensaje amigable del usuario");
  });

  it("skips error.message if it contains technical text", () => {
    const error = new ApiError(
      0,
      "",
      'Error: Request failed with status code 500',
      "/api"
    );

    const message = getUserFriendlyErrorMessage(error, FrontendActionError.LOAD_DATA);
    expect(message).toBe(FallbackActionMessages[FrontendActionError.LOAD_DATA]);
  });

  it("skips error.message if it contains Unexpected token (JSON parse error)", () => {
    const error = new ApiError(
      0,
      "",
      "Unexpected token < in JSON at position 0",
      "/api"
    );

    const message = getUserFriendlyErrorMessage(error, FrontendActionError.UNKNOWN);
    expect(message).toBe(FallbackActionMessages[FrontendActionError.UNKNOWN]);
  });

  it("returns fallback for non-Error input", () => {
    const message = getUserFriendlyErrorMessage("some string", FrontendActionError.DELETE_DATA);
    expect(message).toBe(FallbackActionMessages[FrontendActionError.DELETE_DATA]);
  });

  it("returns fallback for null input", () => {
    const message = getUserFriendlyErrorMessage(null, FrontendActionError.PRINT_ACTION);
    expect(message).toBe(FallbackActionMessages[FrontendActionError.PRINT_ACTION]);
  });
});
