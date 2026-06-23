import { describe, it, expect } from "vitest";
import { ApiError, ApiErrorDetail } from "../api-error";
import { ErrorCode } from "../error-codes";

describe("ApiError Class", () => {
  // Test 1: Create with minimal parameters
  it("should create ApiError with minimal parameters", () => {
    const error = new ApiError(400, ErrorCode.VALIDATION_ERROR, "Invalid input");

    expect(error.status).toBe(400);
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.message).toBe("Invalid input");
    expect(error.name).toBe("ApiError");
  });

  // Test 2: Create with all parameters
  it("should create ApiError with all parameters", () => {
    const details: ApiErrorDetail[] = [
      { field: "email", message: "Invalid email format" },
    ];
    const error = new ApiError(
      422,
      ErrorCode.VALIDATION_ERROR,
      "Validation failed",
      "/api/v1/users",
      "corr-123",
      details,
      "Check email format"
    );

    expect(error.status).toBe(422);
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.message).toBe("Validation failed");
    expect(error.path).toBe("/api/v1/users");
    expect(error.correlationId).toBe("corr-123");
    expect(error.details).toBe(details);
    expect(error.developerMessage).toBe("Check email format");
  });

  // Test 3: Status 400
  it("should handle 400 Bad Request status", () => {
    const error = new ApiError(400, "INVALID_REQUEST", "Bad request");
    expect(error.status).toBe(400);
  });

  // Test 4: Status 401
  it("should handle 401 Unauthorized status", () => {
    const error = new ApiError(401, ErrorCode.AUTH_INVALID_CREDENTIALS, "Invalid credentials");
    expect(error.status).toBe(401);
  });

  // Test 5: Status 403
  it("should handle 403 Forbidden status", () => {
    const error = new ApiError(403, ErrorCode.ACCESS_DENIED, "Access denied");
    expect(error.status).toBe(403);
  });

  // Test 6: Status 404
  it("should handle 404 Not Found status", () => {
    const error = new ApiError(404, ErrorCode.RESOURCE_NOT_FOUND, "Resource not found");
    expect(error.status).toBe(404);
  });

  // Test 7: Status 422
  it("should handle 422 Unprocessable Entity status", () => {
    const error = new ApiError(422, ErrorCode.VALIDATION_ERROR, "Validation error");
    expect(error.status).toBe(422);
  });

  // Test 8: Status 500
  it("should handle 500 Internal Server Error status", () => {
    const error = new ApiError(500, ErrorCode.INTERNAL_ERROR, "Internal error");
    expect(error.status).toBe(500);
  });

  // Test 9: Error code string
  it("should accept string error code", () => {
    const error = new ApiError(400, "CUSTOM_ERROR", "Custom error");
    expect(error.code).toBe("CUSTOM_ERROR");
  });

  // Test 10: Error code enum
  it("should accept ErrorCode enum", () => {
    const error = new ApiError(500, ErrorCode.INTERNAL_ERROR, "Server error");
    expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
  });

  // Test 11: ApiErrorDetail with field
  it("should handle ApiErrorDetail with field", () => {
    const detail: ApiErrorDetail = { field: "username", message: "Already exists" };
    const error = new ApiError(409, "CONFLICT", "Conflict", undefined, undefined, [detail]);

    expect(error.details).toEqual([detail]);
    expect((error.details as ApiErrorDetail[])[0].field).toBe("username");
  });

  // Test 12: ApiErrorDetail without field
  it("should handle ApiErrorDetail without field", () => {
    const detail: ApiErrorDetail = { code: "CUSTOM", message: "Custom error" };
    const error = new ApiError(400, "CUSTOM", "Custom error", undefined, undefined, [detail]);

    expect((error.details as ApiErrorDetail[])[0].code).toBe("CUSTOM");
  });

  // Test 13: Array of details
  it("should handle array of details", () => {
    const details: ApiErrorDetail[] = [
      { field: "email", message: "Invalid email" },
      { field: "password", message: "Too short" },
      { field: "name", message: "Required" },
    ];
    const error = new ApiError(422, "VALIDATION_ERROR", "Validation failed", undefined, undefined, details);

    expect((error.details as ApiErrorDetail[]).length).toBe(3);
  });

  // Test 14: Record object as details
  it("should handle Record object as details", () => {
    const details = { email: "Invalid", password: "Too short" };
    const error = new ApiError(422, "VALIDATION_ERROR", "Validation failed", undefined, undefined, details);

    expect(error.details).toEqual(details);
  });

  // Test 15: Path parameter
  it("should store path parameter", () => {
    const error = new ApiError(400, "ERROR", "Message", "/api/v1/endpoint");
    expect(error.path).toBe("/api/v1/endpoint");
  });

  // Test 16: CorrelationId parameter
  it("should store correlationId parameter", () => {
    const error = new ApiError(
      500,
      "ERROR",
      "Message",
      undefined,
      "req-abc-123"
    );
    expect(error.correlationId).toBe("req-abc-123");
  });

  // Test 17: DeveloperMessage parameter
  it("should store developerMessage parameter", () => {
    const error = new ApiError(
      500,
      "ERROR",
      "User message",
      undefined,
      undefined,
      undefined,
      "This is a developer message"
    );
    expect(error.developerMessage).toBe("This is a developer message");
  });

  // Test 18: Error extends Error
  it("should extend Error class", () => {
    const error = new ApiError(400, "ERROR", "Message");
    expect(error instanceof Error).toBe(true);
  });

  // Test 19: Error name is ApiError
  it("should have name property as ApiError", () => {
    const error = new ApiError(400, "ERROR", "Message");
    expect(error.name).toBe("ApiError");
  });

  // Test 20: Complex details object
  it("should handle complex details object", () => {
    const details = {
      validation: {
        email: ["Invalid format", "Already exists"],
        password: ["Too short"],
      },
      general: ["Database error"],
    };
    const error = new ApiError(422, "VALIDATION_ERROR", "Failed", undefined, undefined, details);

    expect(error.details).toEqual(details);
  });

  // Test 21: Empty message
  it("should accept empty message", () => {
    const error = new ApiError(400, "ERROR", "");
    expect(error.message).toBe("");
  });

  // Test 22: Long message
  it("should handle long message", () => {
    const longMessage = "A".repeat(1000);
    const error = new ApiError(400, "ERROR", longMessage);
    expect(error.message).toBe(longMessage);
    expect(error.message.length).toBe(1000);
  });

  // Test 23: Special characters in message
  it("should handle special characters in message", () => {
    const message = 'Error: "quotes" & <brackets> and émojis ✓';
    const error = new ApiError(400, "ERROR", message);
    expect(error.message).toBe(message);
  });

  // Test 24: Undefined optional parameters
  it("should have undefined optional parameters", () => {
    const error = new ApiError(400, "ERROR", "Message");
    expect(error.path).toBeUndefined();
    expect(error.correlationId).toBeUndefined();
    expect(error.details).toBeUndefined();
    expect(error.developerMessage).toBeUndefined();
  });

  // Test 25: Empty details array
  it("should handle empty details array", () => {
    const error = new ApiError(422, "VALIDATION_ERROR", "Failed", undefined, undefined, []);
    expect(Array.isArray(error.details)).toBe(true);
    expect((error.details as ApiErrorDetail[]).length).toBe(0);
  });

  // Test 26: Multiple error details with codes
  it("should handle multiple error details with different codes", () => {
    const details: ApiErrorDetail[] = [
      { field: "email", code: "INVALID_FORMAT", message: "Invalid email format" },
      { field: "phone", code: "REQUIRED", message: "Phone is required" },
      { code: "CONSTRAINT", message: "Unique constraint violation" },
    ];
    const error = new ApiError(422, "VALIDATION_ERROR", "Failed", undefined, undefined, details);

    expect((error.details as ApiErrorDetail[]).length).toBe(3);
    expect((error.details as ApiErrorDetail[])[2].field).toBeUndefined();
  });

  // Test 27: Status codes as numbers
  it("should accept various status codes", () => {
    const codes = [200, 400, 401, 403, 404, 422, 500, 502, 503];
    codes.forEach((code) => {
      const error = new ApiError(code, "ERROR", "Message");
      expect(error.status).toBe(code);
    });
  });

  // Test 28: All ErrorCode values
  it("should work with all ErrorCode values", () => {
    const codes = Object.values(ErrorCode);
    codes.forEach((code) => {
      const error = new ApiError(500, code, "Message");
      expect(error.code).toBe(code);
    });
  });

  // Test 29: Null correlation ID should be undefined
  it("should handle null vs undefined parameters", () => {
    const error = new ApiError(400, "ERROR", "Message", undefined, undefined);
    expect(error.correlationId).toBeUndefined();
  });

  // Test 30: Complete error object structure
  it("should have complete error object structure", () => {
    const error = new ApiError(
      422,
      ErrorCode.VALIDATION_ERROR,
      "Validation failed",
      "/api/v1/users",
      "req-123",
      [{ field: "email", message: "Invalid" }],
      "Check validation rules"
    );

    expect(error.status).toBe(422);
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.message).toBe("Validation failed");
    expect(error.path).toBe("/api/v1/users");
    expect(error.correlationId).toBe("req-123");
    expect(error.details).toBeDefined();
    expect(error.developerMessage).toBe("Check validation rules");
    expect(error.name).toBe("ApiError");
    expect(error instanceof Error).toBe(true);
  });
});
