import { normalizeApiError, handleNetworkError } from "../normalize-api-error";
import { ApiError } from "../api-error";
import { ErrorCode } from "../error-codes";

function createMockResponse(
  status: number,
  body: Record<string, unknown>,
  url = "http://localhost:6011/api/test"
): Response {
  return {
    status,
    url,
    text: () => Promise.resolve(JSON.stringify(body)),
    ok: status >= 200 && status < 300,
    headers: new Headers(),
    redirected: false,
    statusText: status === 200 ? "OK" : "Error",
    type: "basic",
    clone: () => createMockResponse(status, body, url),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.reject(new Error("Not implemented")),
    json: () => Promise.resolve(body),
  } as Response;
}

describe("normalizeApiError", () => {
  it("normalizes a 400 response", async () => {
    const response = createMockResponse(400, {
      errorCode: "VALIDATION_ERROR",
      message: "Invalid data",
      userMessage: "Datos inválidos",
    });

    const error = await normalizeApiError(response);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe("Datos inválidos");
  });

  it("normalizes a 401 response", async () => {
    const response = createMockResponse(401, {});

    const error = await normalizeApiError(response);

    expect(error.status).toBe(401);
    expect(error.code).toBe(ErrorCode.AUTH_SESSION_EXPIRED);
    expect(error.message).toMatch(/sesión ha expirado/);
  });

  it("normalizes a 404 response", async () => {
    const response = createMockResponse(404, {
      code: "RESOURCE_NOT_FOUND",
    });

    const error = await normalizeApiError(response);

    expect(error.status).toBe(404);
    expect(error.code).toBe("RESOURCE_NOT_FOUND");
    expect(error.message).toMatch(/El recurso solicitado no existe/);
  });

  it("normalizes a 500 response", async () => {
    const response = createMockResponse(500, {});

    const error = await normalizeApiError(response);

    expect(error.status).toBe(500);
    expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
    expect(error.message).toContain("500");
  });

  it("extracts path from response body", async () => {
    const response = createMockResponse(400, {
      message: "error",
      path: "/custom/path",
    });

    const error = await normalizeApiError(response);
    expect(error.path).toBe("/custom/path");
  });

  it("falls back to response.url for path when body has none", async () => {
    const response = createMockResponse(400, { message: "error" }, "http://fallback.url/api");

    const error = await normalizeApiError(response);
    expect(error.path).toBe("http://fallback.url/api");
  });

  it("extracts correlationId", async () => {
    const response = createMockResponse(400, {
      message: "error",
      correlationId: "corr-123",
    });

    const error = await normalizeApiError(response);
    expect(error.correlationId).toBe("corr-123");
  });

  it("extracts details with fields array", async () => {
    const response = createMockResponse(400, {
      message: "error",
      details: {
        fields: [
          { field: "name", message: "Name is required" },
        ],
      },
    });

    const error = await normalizeApiError(response);
    expect(error.details).toEqual([
      { field: "name", message: "Name is required" },
    ]);
  });

  it("extracts details as record when not a fields array", async () => {
    const response = createMockResponse(400, {
      message: "error",
      details: { extra: "info" },
    });

    const error = await normalizeApiError(response);
    expect(error.details).toEqual({ extra: "info" });
  });

  it("handles non-JSON response body", async () => {
    const response = {
      status: 500,
      url: "http://localhost:6011/api/error",
      text: () => Promise.resolve("Internal Server Error"),
      ok: false,
      headers: new Headers(),
      redirected: false,
      statusText: "Internal Server Error",
      type: "basic",
      clone: () => {
        const r = createMockResponse(500, {});
        r.text = () => Promise.resolve("Internal Server Error");
        return r;
      },
      body: null,
      bodyUsed: false,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.reject(new Error("Not implemented")),
      json: () => Promise.reject(new Error("Not JSON")),
    } as Response;

    const error = await normalizeApiError(response);

    expect(error.status).toBe(500);
    expect(error.message).toContain("500");
  });
});

describe("handleNetworkError", () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
  });

  it("creates a network error for web", () => {
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");

    const error = handleNetworkError(new TypeError("Failed to fetch"));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
    expect(error.message).toMatch(/Sin conexion/);
  });

  it("uses desktop-specific message when in Tauri", () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      value: {},
      configurable: true,
      writable: true,
    });

    const error = handleNetworkError(new TypeError("Failed to fetch"));

    expect(error.message).toMatch(/Servidor local no disponible/);
    expect((error.details as Record<string, unknown>)?.isDesktop).toBe(true);
  });

  it("includes original error message in details", () => {
    const original = new Error("connection refused");
    const error = handleNetworkError(original);

    expect((error.details as Record<string, unknown>)?.originalError).toBe("connection refused");
  });

  it("handles non-Error thrown values", () => {
    const error = handleNetworkError("string error");

    expect(error.status).toBe(0);
    expect((error.details as Record<string, unknown>)?.originalError).toBe("string error");
  });
});
