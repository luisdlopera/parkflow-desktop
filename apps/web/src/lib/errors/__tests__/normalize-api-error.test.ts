import { describe, it, expect } from "vitest";
import { normalizeApiError, handleNetworkError } from "@/lib/errors/normalize-api-error";
import { ErrorCode } from "@/lib/errors/error-codes";

describe("normalizeApiError", () => {
  it.each([
    [
      200,
      { userMessage: "Success", path: "/api/v1/test", correlationId: "abc123" },
      "Success",
      200,
    ],
    [
      400,
      { userMessage: "Invalid input", code: "VALIDATION_ERROR", path: "/api/v1/data" },
      "Invalid input",
      400,
    ],
    [
      401,
      { userMessage: "Session expired", path: "/api/v1/protected" },
      "Session expired",
      401,
    ],
    [
      403,
      { userMessage: "Access denied", code: "ACCESS_DENIED", path: "/api/v1/admin" },
      "Access denied",
      403,
    ],
    [
      404,
      { userMessage: "Not found", path: "/api/v1/resource/999" },
      "Not found",
      404,
    ],
    [
      409,
      { userMessage: "Already exists", code: "COMPANY_ALREADY_EXISTS", path: "/api/v1/company" },
      "Already exists",
      409,
    ],
    [
      500,
      { userMessage: "Server error", path: "/api/v1/process" },
      "Server error",
      500,
    ],
  ])("parses successful response with status %p", async (status, body, expectedMsg, _expectedStatus) => {
    const response = new Response(JSON.stringify(body), { status });
    const error = await normalizeApiError(response);
    expect(error.message).toBe(expectedMsg);
    expect(error.status).toBe(status);
  });

  it("handles empty response body", async () => {
    const response = new Response("", { status: 500 });
    const error = await normalizeApiError(response);
    expect(error.status).toBe(500);
    expect(error.message).toContain("No pudimos");
  });

  it("handles malformed JSON", async () => {
    const response = new Response("not json {]", { status: 500 });
    const error = await normalizeApiError(response);
    expect(error.status).toBe(500);
    expect(error.message).toContain("No pudimos");
  });

  it("extracts errorCode from response", async () => {
    const body = { errorCode: "COMPANY_NOT_FOUND", userMessage: "Company not found" };
    const response = new Response(JSON.stringify(body), { status: 404 });
    const error = await normalizeApiError(response);
    expect(error.code).toBe("COMPANY_NOT_FOUND");
  });

  it("extracts code field from response", async () => {
    const body = { code: "USER_EMAIL_ALREADY_EXISTS", userMessage: "Email exists" };
    const response = new Response(JSON.stringify(body), { status: 409 });
    const error = await normalizeApiError(response);
    expect(error.code).toBe("USER_EMAIL_ALREADY_EXISTS");
  });

  it("uses errorCode over code", async () => {
    const body = {
      errorCode: "SPECIFIC_CODE",
      code: "GENERIC_CODE",
      userMessage: "Error",
    };
    const response = new Response(JSON.stringify(body), { status: 400 });
    const error = await normalizeApiError(response);
    expect(error.code).toBe("SPECIFIC_CODE");
  });

  it("maps status 401 to AUTH_SESSION_EXPIRED when no code provided", async () => {
    const response = new Response(JSON.stringify({}), { status: 401 });
    const error = await normalizeApiError(response);
    expect(error.code).toBe(ErrorCode.AUTH_SESSION_EXPIRED);
  });

  it("maps status 403 to ACCESS_DENIED when no code provided", async () => {
    const response = new Response(JSON.stringify({}), { status: 403 });
    const error = await normalizeApiError(response);
    expect(error.code).toBe(ErrorCode.ACCESS_DENIED);
  });

  it("maps unknown status to UNKNOWN_ERROR", async () => {
    const response = new Response(JSON.stringify({}), { status: 418 });
    const error = await normalizeApiError(response);
    expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
  });

  it("provides default message for 400 Bad Request", async () => {
    const response = new Response(JSON.stringify({}), { status: 400 });
    const error = await normalizeApiError(response);
    expect(error.message).toContain("Datos inválidos");
  });

  it("provides default message for 401 Unauthorized", async () => {
    const response = new Response(JSON.stringify({}), { status: 401 });
    const error = await normalizeApiError(response);
    expect(error.message).toContain("sesión");
  });

  it("provides default message for 403 Forbidden", async () => {
    const response = new Response(JSON.stringify({}), { status: 403 });
    const error = await normalizeApiError(response);
    expect(error.message).toContain("permisos");
  });

  it("provides default message for 404 Not Found", async () => {
    const response = new Response(JSON.stringify({}), { status: 404 });
    const error = await normalizeApiError(response);
    expect(error.message).toContain("recurso");
  });

  it("provides default message for 409 Conflict", async () => {
    const response = new Response(JSON.stringify({}), { status: 409 });
    const error = await normalizeApiError(response);
    expect(error.message).toContain("Conflicto");
  });

  it("provides fallback message with status code", async () => {
    const response = new Response(JSON.stringify({}), { status: 418 });
    const error = await normalizeApiError(response);
    expect(error.message).toContain("418");
  });

  it("extracts path from response body", async () => {
    const body = { path: "/api/v1/companies/123" };
    const response = new Response(JSON.stringify(body), { status: 404 });
    const error = await normalizeApiError(response);
    expect(error.path).toBe("/api/v1/companies/123");
  });

  it("extracts correlationId", async () => {
    const body = { correlationId: "req-123-456-789" };
    const response = new Response(JSON.stringify(body), { status: 500 });
    const error = await normalizeApiError(response);
    expect(error.correlationId).toBe("req-123-456-789");
  });

  it("extracts developerMessage", async () => {
    const body = { developerMessage: "Stack trace: ..." };
    const response = new Response(JSON.stringify(body), { status: 500 });
    const error = await normalizeApiError(response);
    expect(error.developerMessage).toBe("Stack trace: ...");
  });

  it("extracts field-level details from response", async () => {
    const body = {
      details: {
        fields: [
          { field: "email", code: "INVALID_FORMAT", message: "Invalid email format" },
          { field: "phone", code: "REQUIRED", message: "Phone is required" },
        ],
      },
    };
    const response = new Response(JSON.stringify(body), { status: 400 });
    const error = await normalizeApiError(response);
    expect(Array.isArray(error.details)).toBe(true);
    if (Array.isArray(error.details)) {
      expect(error.details.length).toBe(2);
      expect(error.details[0].field).toBe("email");
      expect(error.details[1].field).toBe("phone");
    }
  });

  it.each([
    [200, "Success"],
    [201, "Created"],
    
    [400, "Bad Request"],
    [401, "Unauthorized"],
    [403, "Forbidden"],
    [404, "Not Found"],
    [409, "Conflict"],
    [500, "Internal Server Error"],
    [503, "Service Unavailable"],
  ])("handles HTTP status %p", async (status, _name) => {
    const response = new Response(JSON.stringify({}), { status });
    const error = await normalizeApiError(response);
    expect(error.status).toBe(status);
  });

  it("prioritizes userMessage over message", async () => {
    const body = {
      userMessage: "User-friendly message",
      message: "Generic message",
    };
    const response = new Response(JSON.stringify(body), { status: 400 });
    const error = await normalizeApiError(response);
    expect(error.message).toBe("User-friendly message");
  });

  it("handles response with all optional fields", async () => {
    const body = {
      userMessage: "Complete error",
      code: "SPECIFIC_ERROR",
      path: "/api/v1/test",
      correlationId: "corr-123",
      developerMessage: "Developer info",
      details: {
        fields: [
          { field: "test", message: "Test message" },
        ],
      },
    };
    const response = new Response(JSON.stringify(body), { status: 400 });
    const error = await normalizeApiError(response);
    expect(error.message).toBe("Complete error");
    expect(error.code).toBe("SPECIFIC_ERROR");
    expect(error.path).toBe("/api/v1/test");
    expect(error.correlationId).toBe("corr-123");
    expect(error.developerMessage).toBe("Developer info");
    expect(error.details).toBeDefined();
  });

  it("handles response with no optional fields", async () => {
    const response = new Response(JSON.stringify({}), { status: 500 });
    const error = await normalizeApiError(response);
    expect(error.status).toBe(500);
    expect(error.message).toBeDefined();
    expect(error.code).toBeDefined();
  });

  it("handles null JSON body", async () => {
    const response = new Response("null", { status: 500 });
    const error = await normalizeApiError(response);
    expect(error.status).toBe(500);
  });

  it("handles array JSON body", async () => {
    const response = new Response('[]', { status: 500 });
    const error = await normalizeApiError(response);
    expect(error.status).toBe(500);
  });
});

describe("handleNetworkError", () => {
  it("creates ApiError with NETWORK_ERROR code", () => {
    const error = new Error("Network unreachable");
    const apiError = handleNetworkError(error);
    expect(apiError.code).toBe(ErrorCode.NETWORK_ERROR);
  });

  it("sets status to 0", () => {
    const error = new Error("Connection failed");
    const apiError = handleNetworkError(error);
    expect(apiError.status).toBe(0);
  });

  it("includes original error message in details", () => {
    const originalMsg = "Socket timeout";
    const error = new Error(originalMsg);
    const apiError = handleNetworkError(error);
    expect(apiError.details).toBeDefined();
    if (apiError.details && typeof apiError.details === "object") {
      expect((apiError.details as any).originalError).toContain(originalMsg);
    }
  });

  it("handles Error objects", () => {
    const error = new Error("Connection refused");
    const apiError = handleNetworkError(error);
    expect(apiError.message).toBeDefined();
    expect(typeof apiError.message).toBe("string");
  });

  it("handles non-Error objects", () => {
    const apiError = handleNetworkError("string error");
    expect(apiError.message).toBeDefined();
    expect(apiError.code).toBe(ErrorCode.NETWORK_ERROR);
  });

  it("handles null error", () => {
    const apiError = handleNetworkError(null);
    expect(apiError.code).toBe(ErrorCode.NETWORK_ERROR);
    expect(apiError.details).toBeDefined();
  });

  it("handles undefined error", () => {
    const apiError = handleNetworkError(undefined);
    expect(apiError.code).toBe(ErrorCode.NETWORK_ERROR);
  });

  it.each([
    [new Error("ECONNREFUSED")],
    [new Error("ENOTFOUND")],
    [new Error("ETIMEDOUT")],
    [new Error("ERR_NETWORK")],
    ["Network request failed"],
  ])("includes error message in details", (input) => {
    const apiError = handleNetworkError(input);
    expect(apiError.details).toBeDefined();
  });

  it("returns proper ApiError instance", () => {
    const apiError = handleNetworkError(new Error("Test"));
    expect(apiError.status).toBe(0);
    expect(apiError.code).toBe(ErrorCode.NETWORK_ERROR);
    expect(apiError.message).toBeDefined();
    expect(apiError.name).toBe("ApiError");
  });

  it.each([
    new Error("Connection timeout"),
    new Error("CORS error"),
    new Error("DNS lookup failed"),
  ])("handles various error types", (error) => {
    const apiError = handleNetworkError(error);
    expect(apiError.code).toBe(ErrorCode.NETWORK_ERROR);
    expect(apiError.status).toBe(0);
  });
});

describe("Error normalization integration", () => {
  it("handles complete error lifecycle", async () => {
    const body = {
      userMessage: "Database constraint violation",
      code: "DATABASE_CONSTRAINT_ERROR",
      path: "/api/v1/companies",
      correlationId: "req-123",
      developerMessage: "FK constraint failed",
      details: {
        fields: [{ field: "name", message: "Duplicate name" }],
      },
    };

    const response = new Response(JSON.stringify(body), { status: 409 });
    const error = await normalizeApiError(response);

    expect(error.status).toBe(409);
    expect(error.code).toBe("DATABASE_CONSTRAINT_ERROR");
    expect(error.message).toBe("Database constraint violation");
    expect(error.correlationId).toBe("req-123");
  });

  it("provides consistent error structure across scenarios", async () => {
    const scenarios = [
      { status: 400, body: {} },
      { status: 401, body: {} },
      { status: 403, body: {} },
      { status: 404, body: {} },
      { status: 500, body: {} },
    ];

    for (const scenario of scenarios) {
      const response = new Response(JSON.stringify(scenario.body), {
        status: scenario.status,
      });
      const error = await normalizeApiError(response);

      expect(error).toBeDefined();
      expect(error.status).toBe(scenario.status);
      expect(error.code).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });
});
