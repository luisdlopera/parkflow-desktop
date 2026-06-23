import { describe, it, expect, vi, beforeEach } from "vitest";

const mockNormalizeError = vi.fn();
const mockHandleNetworkError = vi.fn();

vi.mock("@/lib/errors/normalize-api-error", () => ({
  normalizeApiError: (...args: any[]) => mockNormalizeError(...args),
  handleNetworkError: (...args: any[]) => mockHandleNetworkError(...args),
}));

const mockLocalFirst = vi.fn();
vi.mock("@/lib/local-first/fetch-interceptor", () => ({
  handleLocalFirstFetch: (...args: any[]) => mockLocalFirst(...args),
}));

describe("safeFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    mockLocalFirst.mockResolvedValue(null);
  });

  it("makes GET request by default and parses JSON", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
      status: 200,
      url: "http://test/api",
    } as any);

    const { default: safeFetch } = await import("@/lib/api/fetch");
    const result = await safeFetch("http://test/api");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://test/api",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(result).toEqual({ data: "test" });
  });

  it("parses JSON response correctly", async () => {
    const data = { items: [1, 2, 3] };
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
      status: 200,
      url: "http://test/api",
    } as any);

    const { default: safeFetch } = await import("@/lib/api/fetch");
    const result = await safeFetch("http://test/api");
    expect(result).toEqual(data);
  });

  it("throws an error on non-OK response", async () => {
    const apiError = new Error("Bad Request");
    apiError.name = "ApiError";
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 400,
      url: "http://test/api/error",
    } as any);
    mockNormalizeError.mockResolvedValue(apiError);

    const { default: safeFetch } = await import("@/lib/api/fetch");
    await expect(safeFetch("http://test/api/error")).rejects.toThrow("Bad Request");
    expect(mockNormalizeError).toHaveBeenCalled();
  });

  it("includes custom headers in the request", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
      status: 200,
      url: "http://test/api",
    } as any);

    const { default: safeFetch } = await import("@/lib/api/fetch");
    await safeFetch("http://test/api", {
      headers: { Authorization: "Bearer test-token" },
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://test/api",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      }),
    );
  });

  it("handles network errors by calling handleNetworkError", async () => {
    const networkError = new Error("Connection failed");
    networkError.name = "ApiError";
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error("Failed to fetch"));
    mockHandleNetworkError.mockReturnValue(networkError);

    const { default: safeFetch } = await import("@/lib/api/fetch");
    await expect(safeFetch("http://test/api")).rejects.toThrow("Connection failed");
    expect(mockHandleNetworkError).toHaveBeenCalled();
  });

  it("returns empty object on 204 No Content", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 204,
      url: "http://test/api/delete",
    } as any);

    const { default: safeFetch } = await import("@/lib/api/fetch");
    const result = await safeFetch("http://test/api/delete");
    expect(result).toEqual({});
  });

  it("does not call json() on 204 response", async () => {
    const jsonSpy = vi.fn();
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 204,
      url: "http://test/api",
      json: jsonSpy,
    } as any);

    const { default: safeFetch } = await import("@/lib/api/fetch");
    await safeFetch("http://test/api");
    expect(jsonSpy).not.toHaveBeenCalled();
  });
});
