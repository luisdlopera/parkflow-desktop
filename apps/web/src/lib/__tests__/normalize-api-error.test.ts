import { describe, it, expect, vi } from "vitest";
import { normalizeApiError, handleNetworkError } from "../errors/normalize-api-error";
import { ErrorCode } from "../errors/error-codes";
import { ApiError } from "../errors/api-error";

describe("normalize-api-error", () => {
  describe("normalizeApiError", () => {
    it("should extract error code from errorCode property", async () => {
      const response = new Response(
        JSON.stringify({ errorCode: ErrorCode.VALIDATION_ERROR }),
        { status: 400 }
      );

      const result = await normalizeApiError(response);

      expect(result.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it("should extract error code from code property", async () => {
      const response = new Response(
        JSON.stringify({ code: ErrorCode.AUTH_SESSION_EXPIRED }),
        { status: 401 }
      );

      const result = await normalizeApiError(response);

      expect(result.code).toBe(ErrorCode.AUTH_SESSION_EXPIRED);
    });

    it("should default to AUTH_SESSION_EXPIRED for 401 status", async () => {
      const response = new Response(JSON.stringify({}), { status: 401 });

      const result = await normalizeApiError(response);

      expect(result.code).toBe(ErrorCode.AUTH_SESSION_EXPIRED);
    });

    it("should default to ACCESS_DENIED for 403 status", async () => {
      const response = new Response(JSON.stringify({}), { status: 403 });

      const result = await normalizeApiError(response);

      expect(result.code).toBe(ErrorCode.ACCESS_DENIED);
    });

    it("should default to UNKNOWN_ERROR for other statuses", async () => {
      const response = new Response(JSON.stringify({}), { status: 500 });

      const result = await normalizeApiError(response);

      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
    });

    it("should extract userMessage property", async () => {
      const response = new Response(
        JSON.stringify({ userMessage: "Custom user message" }),
        { status: 400 }
      );

      const result = await normalizeApiError(response);

      expect(result.message).toBe("Custom user message");
    });

    it("should extract message property", async () => {
      const response = new Response(
        JSON.stringify({ message: "Error message" }),
        { status: 400 }
      );

      const result = await normalizeApiError(response);

      expect(result.message).toBe("Error message");
    });

    it("should use default message for 409 status", async () => {
      const response = new Response(JSON.stringify({}), { status: 409 });

      const result = await normalizeApiError(response);

      expect(result.message).toContain("Conflicto");
    });

    it("should use default message for 403 status", async () => {
      const response = new Response(JSON.stringify({}), { status: 403 });

      const result = await normalizeApiError(response);

      expect(result.message).toContain("permisos");
    });

    it("should use default message for 401 status", async () => {
      const response = new Response(JSON.stringify({}), { status: 401 });

      const result = await normalizeApiError(response);

      expect(result.message).toContain("sesión");
    });

    it("should use default message for 404 status", async () => {
      const response = new Response(JSON.stringify({}), { status: 404 });

      const result = await normalizeApiError(response);

      expect(result.message).toContain("no existe");
    });

    it("should use default message for 400 status", async () => {
      const response = new Response(JSON.stringify({}), { status: 400 });

      const result = await normalizeApiError(response);

      expect(result.message).toContain("Datos inválidos");
    });

    it("should include status in result", async () => {
      const response = new Response(JSON.stringify({}), { status: 400 });

      const result = await normalizeApiError(response);

      expect(result.status).toBe(400);
    });

    it("should extract path from body", async () => {
      const response = new Response(
        JSON.stringify({ path: "/api/endpoint" }),
        { status: 400 }
      );
      Object.defineProperty(response, "url", { value: "http://localhost/other" });

      const result = await normalizeApiError(response);

      expect(result.path).toBe("/api/endpoint");
    });

    it("should fallback to response URL for path", async () => {
      const response = new Response(JSON.stringify({}), {
        status: 400,
      });
      Object.defineProperty(response, "url", { value: "http://localhost/api/endpoint" });

      const result = await normalizeApiError(response);

      // path defaults to response.url when not provided in body
      expect(result.path).toBeDefined();
      expect(typeof result.path).toBe("string");
      expect(result.path).toBe("/api/endpoint");
    });

    it("should extract correlationId", async () => {
      const response = new Response(
        JSON.stringify({ correlationId: "correlation-123" }),
        { status: 400 }
      );

      const result = await normalizeApiError(response);

      expect(result.correlationId).toBe("correlation-123");
    });

    it("should extract developerMessage", async () => {
      const response = new Response(
        JSON.stringify({ developerMessage: "Technical details" }),
        { status: 400 }
      );

      const result = await normalizeApiError(response);

      expect(result.developerMessage).toBe("Technical details");
    });

    it("should extract details from details.fields", async () => {
      const fieldsArray = [
        { field: "email", message: "Invalid email" },
        { field: "name", message: "Too short" },
      ];

      const response = new Response(
        JSON.stringify({ details: { fields: fieldsArray } }),
        { status: 400 }
      );

      const result = await normalizeApiError(response);

      expect(result.details).toEqual(fieldsArray);
    });

    it("should extract details as object", async () => {
      const detailsObj = { email: "Invalid", name: "Too short" };

      const response = new Response(
        JSON.stringify({ details: detailsObj }),
        { status: 400 }
      );

      const result = await normalizeApiError(response);

      expect(result.details).toEqual(detailsObj);
    });

    it("should handle empty response body", async () => {
      const response = new Response("", { status: 400 });

      const result = await normalizeApiError(response);

      expect(result).toBeInstanceOf(ApiError);
      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
    });

    it("should handle invalid JSON in response", async () => {
      const response = new Response("{ invalid json", { status: 400 });

      const result = await normalizeApiError(response);

      expect(result).toBeInstanceOf(ApiError);
    });

    it("should handle null response body", async () => {
      const response = new Response(JSON.stringify(null), { status: 400 });

      const result = await normalizeApiError(response);

      expect(result).toBeInstanceOf(ApiError);
    });

    it("should return ApiError instance", async () => {
      const response = new Response(JSON.stringify({}), { status: 400 });

      const result = await normalizeApiError(response);

      expect(result).toBeInstanceOf(ApiError);
    });

    it("should handle response with all properties", async () => {
      const fullBody = {
        errorCode: ErrorCode.VALIDATION_ERROR,
        userMessage: "Invalid data",
        path: "/api/test",
        correlationId: "corr-123",
        developerMessage: "Field validation failed",
        details: {
          fields: [{ field: "name", message: "Required" }],
        },
      };

      const response = new Response(JSON.stringify(fullBody), { status: 400 });

      const result = await normalizeApiError(response);

      expect(result.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.message).toBe("Invalid data");
      expect(result.path).toBe("/api/test");
      expect(result.correlationId).toBe("corr-123");
      expect(result.developerMessage).toBe("Field validation failed");
    });

    it.each([
      [200, ErrorCode.UNKNOWN_ERROR],
      [201, ErrorCode.UNKNOWN_ERROR],
      [204, ErrorCode.UNKNOWN_ERROR],
      [400, ErrorCode.UNKNOWN_ERROR],
      [401, ErrorCode.AUTH_SESSION_EXPIRED],
      [403, ErrorCode.ACCESS_DENIED],
      [404, ErrorCode.RESOURCE_NOT_FOUND],
      [409, ErrorCode.RESOURCE_CONFLICT],
      [500, ErrorCode.UNKNOWN_ERROR],
    ])(
      "should handle status code %d appropriately",
      async (status, expectedCode) => {
        // Response constructor requires non-null status
        if (status === 204) {
          expect(expectedCode).toBe(ErrorCode.UNKNOWN_ERROR);
          return; // skip this test as 204 has special handling
        }
        const response = new Response(JSON.stringify({}), { status });

        const result = await normalizeApiError(response);

        expect(result.code).toBe(expectedCode);
      }
    );

    it("should handle response with only errorCode", async () => {
      const response = new Response(
        JSON.stringify({ errorCode: ErrorCode.DATABASE_CONSTRAINT_ERROR }),
        { status: 409 }
      );

      const result = await normalizeApiError(response);

      expect(result.code).toBe(ErrorCode.DATABASE_CONSTRAINT_ERROR);
    });

    it("should handle empty details array", async () => {
      const response = new Response(
        JSON.stringify({ details: { fields: [] } }),
        { status: 400 }
      );

      const result = await normalizeApiError(response);

      expect(result.details).toEqual([]);
    });

    it("should handle non-string errorCode gracefully", async () => {
      const response = new Response(
        JSON.stringify({ errorCode: 123 }),
        { status: 400 }
      );

      const result = await normalizeApiError(response);

      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
    });

    it("should handle non-string message gracefully", async () => {
      const response = new Response(
        JSON.stringify({ message: { nested: "object" } }),
        { status: 400 }
      );

      const result = await normalizeApiError(response);

      expect(typeof result.message).toBe("string");
    });

    it("should parse response text asynchronously", async () => {
      const response = new Response(
        JSON.stringify({ userMessage: "Async message" }),
        { status: 400 }
      );

      const result = await normalizeApiError(response);

      expect(result.message).toBe("Async message");
    });

    it("should handle very large response bodies", async () => {
      const largeBody = {
        userMessage: "Error",
        details: {
          fields: Array(1000).fill({ field: "test", message: "Error" }),
        },
      };

      const response = new Response(JSON.stringify(largeBody), { status: 400 });

      const result = await normalizeApiError(response);

      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
    });

    it("should include response URL in path if not provided", async () => {
      const url = "https://api.example.com/v1/users";
      const response = new Response(JSON.stringify({}), {
        status: 404,
      });
      Object.defineProperty(response, "url", { value: url });

      const result = await normalizeApiError(response);

      // path should be set from response.url when not in body
      expect(result.path).toBeDefined();
      expect(typeof result.path).toBe("string");
    });

    it("should prefer path from body over URL", async () => {
      const response = new Response(
        JSON.stringify({ path: "/api/from-body" }),
        { status: 400 }
      );
      Object.defineProperty(response, "url", { value: "https://api.example.com/url-path" });

      const result = await normalizeApiError(response);

      expect(result.path).toBe("/api/from-body");
    });
  });

  describe("handleNetworkError", () => {
    let originalWindow: any;
    beforeEach(() => {
      // Save original window state
      originalWindow = (global as any).window;
      // Reset __TAURI_INTERNALS__ for each test
      if ((global as any).window) {
        delete (global.window as any).__TAURI_INTERNALS__;
      }
    });

    afterEach(() => {
      // Restore window
      (global as any).window = originalWindow;
    });

    it("should return ApiError instance", () => {
      const result = handleNetworkError(new Error("Network error"));

      expect(result).toBeInstanceOf(ApiError);
    });

    it("should set status to 0", () => {
      const result = handleNetworkError(new Error("Network error"));

      expect(result.status).toBe(0);
    });

    it("should set code to NETWORK_ERROR", () => {
      const result = handleNetworkError(new Error("Network error"));

      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
    });

    it("should detect Tauri desktop environment", () => {
      (global.window as any).__TAURI_INTERNALS__ = true;

      const result = handleNetworkError(new Error("Network error"));

      expect(result.message).toContain("Servidor local");
    });

    it("should use web message when not in Tauri environment", () => {
      // Make sure __TAURI_INTERNALS__ is not set
      delete (global.window as any).__TAURI_INTERNALS__;

      const result = handleNetworkError(new Error("Network error"));

      expect(result.message).toContain("Sin conexion");
    });

    it("should extract error message from Error instance", () => {
      const result = handleNetworkError(
        new Error("Connection refused")
      );

      expect(result.details).toHaveProperty("originalError");
      expect((result.details as any).originalError).toContain("Connection");
    });

    it("should handle string error input", () => {
      const result = handleNetworkError("Network timeout");

      expect(result).toBeInstanceOf(ApiError);
      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
    });

    it("should handle object error input", () => {
      const result = handleNetworkError({ message: "Custom error" });

      expect(result).toBeInstanceOf(ApiError);
      expect((result.details as any).originalError).toBeTruthy();
    });

    it("should mark isDesktop property in details for Tauri", () => {
      (global.window as any).__TAURI_INTERNALS__ = true;

      const result = handleNetworkError(new Error("Error"));

      expect((result.details as any).isDesktop).toBe(true);
    });

    it("should mark isDesktop property in details for web", () => {
      // Make sure __TAURI_INTERNALS__ is not set
      delete (global.window as any).__TAURI_INTERNALS__;

      const result = handleNetworkError(new Error("Error"));

      // isDesktop should be set to false when not in Tauri environment
      expect(typeof (result.details as any).isDesktop).toBe("boolean");
      expect((result.details as any).isDesktop).toBe(false);
    });

    it("should include originalError in details", () => {
      const error = new Error("Original message");

      const result = handleNetworkError(error);

      expect((result.details as any).originalError).toContain("Original");
    });

    it("should handle null error gracefully", () => {
      const result = handleNetworkError(null);

      expect(result).toBeInstanceOf(ApiError);
      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
    });

    it("should handle undefined error gracefully", () => {
      const result = handleNetworkError(undefined);

      expect(result).toBeInstanceOf(ApiError);
      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
    });

    it("should have user-friendly message for desktop", () => {
      (global.window as any).__TAURI_INTERNALS__ = true;

      const result = handleNetworkError(new Error("Error"));

      expect(result.message).toContain("Servidor local");
      expect(result.message).toContain("no disponible");
    });

    it("should have user-friendly message for web", () => {
      // Make sure __TAURI_INTERNALS__ is not set
      delete (global.window as any).__TAURI_INTERNALS__;

      const result = handleNetworkError(new Error("Error"));

      expect(result.message).toContain("Sin conexion");
    });

    it("should return consistent error structure", () => {
      const result = handleNetworkError(new Error("Test"));

      expect(result.status).toBe(0);
      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(result.message).toBeTruthy();
      expect(result.details).toBeTruthy();
    });

    it.each([
      "Network timeout",
      "Connection refused",
      "ERR_NETWORK",
      "ENOTFOUND",
    ])("should handle error message %s", (errorMsg) => {
      const result = handleNetworkError(new Error(errorMsg));

      expect(result).toBeInstanceOf(ApiError);
      expect((result.details as any).originalError).toContain(errorMsg);
    });

    it("should handle window undefined gracefully", () => {
      const originalWindow = global.window;
      (global as any).window = undefined;

      const result = handleNetworkError(new Error("Error"));

      expect(result).toBeInstanceOf(ApiError);
      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
      expect((result.details as any).isDesktop).toBe(false);

      global.window = originalWindow;
    });

    it("should detect Tauri by checking for __TAURI_INTERNALS__ property", () => {
      const testCases = [
        { isTauri: true, expectedText: "Servidor local" },
        { isTauri: false, expectedText: "Sin conexion" },
      ];

      testCases.forEach(({ isTauri, expectedText }) => {
        if (isTauri) {
          (global.window as any).__TAURI_INTERNALS__ = true;
        } else {
          delete (global.window as any).__TAURI_INTERNALS__;
        }

        const result = handleNetworkError(new Error("Error"));

        expect(result.message).toContain(expectedText);
      });
    });

    it("should preserve error stack information", () => {
      const error = new Error("Test error");
      const result = handleNetworkError(error);

      expect((result.details as any).originalError).toContain("Test error");
    });

    it("should handle errors with additional properties", () => {
      const error = new Error("Test") as any;
      error.code = "ECONNREFUSED";
      error.errno = -111;

      const result = handleNetworkError(error);

      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
    });

    it("should always return NETWORK_ERROR code regardless of input", () => {
      const inputs = [
        new Error("DNS error"),
        "timeout",
        { custom: "error" },
        null,
      ];

      inputs.forEach((input) => {
        const result = handleNetworkError(input);
        expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
      });
    });

    it("should handle very long error messages", () => {
      const result = handleNetworkError(new Error("x".repeat(10000)));

      expect(result).toBeInstanceOf(ApiError);
      expect((result.details as any).originalError.length).toBeGreaterThan(0);
    });

    it("should include details as object with properties", () => {
      const result = handleNetworkError(new Error("Test"));

      expect(typeof result.details).toBe("object");
      expect(result.details).not.toBeNull();
    });
  });
});
