import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSearch } from "../useSearch";

const mockHttpRequest = vi.hoisted(() => vi.fn());
const mockAuthHeaders = vi.hoisted(() => vi.fn());

vi.mock("@/lib/http-client", () => ({
  httpRequest: mockHttpRequest,
}));

vi.mock("@/features/auth/services/auth-domain.service", () => ({
  authHeaders: mockAuthHeaders,
}));

const mockResponse = {
  query: "abc",
  results: {
    VEHICLE: [{ id: "v-1", type: "VEHICLE", title: "ABC123", subtitle: "Carro", actionUrl: "/", score: 1 }],
  },
  processingTimeMs: 12,
};

const waitOptions = {
  advanceTimers: (ms: number) => {
    vi.advanceTimersByTime(ms);
  },
};

describe("useSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockAuthHeaders.mockResolvedValue({ Authorization: "Bearer token" });
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:6011/api/v1/operations";
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("returns null results for empty query", () => {
    const { result } = renderHook(() => useSearch(""));

    expect(result.current.results).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("returns null results for short queries", () => {
    const { result } = renderHook(() => useSearch("a"));

    expect(result.current.results).toBeNull();
    expect(mockHttpRequest).not.toHaveBeenCalled();
  });

  it("debounces search and returns results", async () => {
    mockHttpRequest.mockResolvedValue(mockResponse);

    const { result, rerender } = renderHook(({ query }) => useSearch(query), {
      initialProps: { query: "ab" },
    });

    expect(result.current.results).toBeNull();

    rerender({ query: "abc" });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();
    });

    expect(mockHttpRequest).toHaveBeenCalledWith(
      "http://localhost:6011/api/v1/search?q=abc",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(result.current.results).toEqual(mockResponse);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it.skip("shows loading while fetching", async () => {
    mockHttpRequest.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 500)),
    );

    const { result, rerender } = renderHook(({ query }) => useSearch(query), {
      initialProps: { query: "ab" },
    });

    rerender({ query: "abc" });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(500);
      await vi.runAllTimersAsync();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.results).toEqual(mockResponse);
  });

  it("handles search errors", async () => {
    mockHttpRequest.mockRejectedValue(new Error("Search service unavailable"));

    const { result, rerender } = renderHook(({ query }) => useSearch(query), {
      initialProps: { query: "ab" },
    });

    rerender({ query: "abc" });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Search service unavailable");
    expect(result.current.results).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("includes scope in request when provided", async () => {
    mockHttpRequest.mockResolvedValue(mockResponse);

    const { result, rerender } = renderHook(
      ({ query, scope }) => useSearch(query, scope),
      { initialProps: { query: "ab", scope: "vehicle" } },
    );

    rerender({ query: "abc", scope: "vehicle" });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();
    });

    expect(mockHttpRequest).toHaveBeenCalledWith(
      "http://localhost:6011/api/v1/search?q=abc&scope=vehicle",
      expect.any(Object),
    );
    expect(result.current.isLoading).toBe(false);
  });

  it("clears previous results when query becomes empty", async () => {
    mockHttpRequest.mockResolvedValue(mockResponse);

    const { result, rerender } = renderHook(({ query }) => useSearch(query), {
      initialProps: { query: "abc" },
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();
    });

    expect(result.current.results).not.toBeNull();

    rerender({ query: "" });

    expect(result.current.results).toBeNull();
  });
});
