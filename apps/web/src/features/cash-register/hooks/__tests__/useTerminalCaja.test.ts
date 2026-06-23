import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTerminalCaja } from "../useTerminalCaja";

const mockCashCurrent = vi.hoisted(() => vi.fn());
const mockGetAndCacheCashPolicy = vi.hoisted(() => vi.fn());

vi.mock("@/lib/cash/cash-api", () => ({
  cashCurrent: mockCashCurrent,
}));

vi.mock("@/features/cash-register/services/cash-policy.service", () => ({
  getAndCacheCashPolicy: mockGetAndCacheCashPolicy,
}));

const mockPolicy = {
  requireOpenForPayment: true,
  offlineCloseAllowed: true,
  offlineMaxManualMovement: 200000,
  operationsHint: "Opere con normalidad",
  resolvedForSite: "Principal",
};

const mockSession = {
  id: "sess-1",
  status: "OPEN",
  register: { id: "reg-1", site: "Principal", terminal: "T1", label: null },
  operatorId: "user-1",
  openingAmount: 50000,
  openedAt: "2025-06-01T08:00:00Z",
  closedAt: null,
};

describe("useTerminalCaja", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_PARKING_SITE", "Principal");
    vi.stubEnv("NEXT_PUBLIC_TERMINAL_ID", "T1");
    mockGetAndCacheCashPolicy.mockResolvedValue(mockPolicy);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fetches terminal caja and reports open", async () => {
    mockCashCurrent.mockResolvedValue(mockSession);

    const { result } = renderHook(() => useTerminalCaja());

    expect(result.current.caja.status).toBe("loading");
    await waitFor(() => expect(result.current.caja.status).toBe("open"));
    expect(mockCashCurrent).toHaveBeenCalledWith("Principal", "T1");
    expect(result.current.policy).toEqual(mockPolicy);
    expect(result.current.requireOpenForPayment).toBe(true);
  });

  it("reports closed when there is no open session", async () => {
    mockCashCurrent.mockRejectedValue(new Error("HTTP 404 No hay caja abierta"));

    const { result } = renderHook(() => useTerminalCaja());

    await waitFor(() => expect(result.current.caja.status).toBe("closed"));
  });

  it("handles network errors", async () => {
    mockCashCurrent.mockRejectedValue(new Error("Failed to fetch"));

    const { result } = renderHook(() => useTerminalCaja());

    await waitFor(() =>
      expect(result.current.caja).toEqual({ status: "error", reason: "network" }),
    );
  });

  it("handles auth errors", async () => {
    mockCashCurrent.mockRejectedValue(new Error("HTTP 401 AUTH_UNAUTHORIZED"));

    const { result } = renderHook(() => useTerminalCaja());

    await waitFor(() =>
      expect(result.current.caja).toEqual({ status: "error", reason: "auth" }),
    );
  });

  it("handles unknown errors", async () => {
    mockCashCurrent.mockRejectedValue(new Error("Something unexpected"));

    const { result } = renderHook(() => useTerminalCaja());

    await waitFor(() =>
      expect(result.current.caja).toEqual({ status: "error", reason: "unknown" }),
    );
  });

  it("falls back to localStorage terminal id", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_PARKING_SITE", "Principal");
    window.localStorage.setItem("parkflow_terminal_id", "LOCAL-T1");
    mockCashCurrent.mockResolvedValue(mockSession);

    const { result } = renderHook(() => useTerminalCaja());
    await waitFor(() => expect(result.current.caja.status).toBe("open"));

    expect(mockCashCurrent).toHaveBeenCalledWith("Principal", "LOCAL-T1");
    window.localStorage.removeItem("parkflow_terminal_id");
  });
});
