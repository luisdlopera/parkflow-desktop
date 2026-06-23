import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useActiveSessions } from "../useActiveSessions";

const mockUseDebounce = vi.hoisted(() => vi.fn((value: string) => value));

vi.mock("@/hooks/core/useDebounce", () => ({
  useDebounce: mockUseDebounce,
}));

const swrState: Record<string, any> = {};
const swrMock = vi.hoisted(() =>
  vi.fn((key: any) => {
    const cacheKey = Array.isArray(key) ? JSON.stringify(key) : key;
    return swrState[cacheKey] ?? {
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    };
  }),
);

vi.mock("swr", () => ({
  default: swrMock,
}));

const mockSessions = {
  data: [
    {
      ticketNumber: "T001",
      plate: "ABC123",
      vehicleType: "CAR",
      duration: "1h",
      rateName: "Hora",
      parkingSpaceCode: "A1",
    },
  ],
  meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
};

const mockSummary = { availableSpaces: 50, activeSpaces: 10 };

function keyFor(params: Record<string, any>) {
  return JSON.stringify(["active-sessions", params]);
}

describe("useActiveSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(swrState).forEach((k) => delete swrState[k]);
    mockUseDebounce.mockImplementation((value: string) => value);
  });

  it("fetches sessions with SWR", () => {
    swrState[keyFor({ search: "" })] = {
      data: { sessions: mockSessions, summary: mockSummary },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    };

    const { result } = renderHook(() => useActiveSessions({ search: "" }));

    expect(result.current.rows).toEqual(mockSessions.data);
    expect(result.current.meta).toEqual(mockSessions.meta);
    expect(result.current.summary).toEqual(mockSummary);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("passes search params through the SWR key", () => {
    mockUseDebounce.mockReturnValue("ABC");

    renderHook(() => useActiveSessions({ search: "ABC", page: 2, limit: 10 }));

    const expectedKey = ["active-sessions", { search: "ABC", page: 2, limit: 10 }];
    expect(swrMock).toHaveBeenCalledWith(
      expectedKey,
      expect.any(Function),
      expect.objectContaining({ refreshInterval: 5000 }),
    );
  });

  it("configures polling every 5 seconds", () => {
    renderHook(() => useActiveSessions());

    expect(swrMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Function),
      expect.objectContaining({
        refreshInterval: 5000,
        revalidateOnFocus: true,
        errorRetryCount: 3,
        keepPreviousData: true,
      }),
    );
  });

  it("exposes an error state when SWR fails", () => {
    swrState[keyFor({ search: "" })] = {
      data: undefined,
      error: new Error("Network error"),
      isLoading: false,
      mutate: vi.fn(),
    };

    const { result } = renderHook(() => useActiveSessions({ search: "" }));

    expect(result.current.error).toBe("Network error");
    expect(result.current.rows).toEqual([]);
  });

  it("handles array responses without meta", () => {
    swrState[keyFor({ search: "" })] = {
      data: { sessions: mockSessions.data, summary: null },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    };

    const { result } = renderHook(() => useActiveSessions({ search: "" }));

    expect(result.current.rows).toEqual(mockSessions.data);
    expect(result.current.meta).toEqual({
      total: 1,
      page: 1,
      limit: 1,
      totalPages: 1,
    });
  });

  it("exposes reload as the SWR mutate function", () => {
    const mutate = vi.fn();
    swrState[keyFor({ search: "" })] = {
      data: { sessions: mockSessions, summary: mockSummary },
      error: undefined,
      isLoading: false,
      mutate,
    };

    const { result } = renderHook(() => useActiveSessions({ search: "" }));

    expect(result.current.reload).toBe(mutate);
  });
});
