import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDashboardData } from "../useDashboardData";
import {
  fetchDashboardSummary,
  fetchOperationalHealth,
  fetchActiveSessions,
  postOperationalAction,
} from "@/lib/api/dashboard-api";

vi.mock("@/lib/api/dashboard-api", () => ({
  fetchDashboardSummary: vi.fn(),
  fetchOperationalHealth: vi.fn(),
  fetchActiveSessions: vi.fn(),
  postOperationalAction: vi.fn(),
}));

const mockSummary = {
  activeVehicles: 45,
  totalCapacity: 100,
  availableSpaces: 55,
  occupancyPercent: 45,
  entriesSinceMidnight: 30,
  exitsSinceMidnight: 20,
  reprintsSinceMidnight: 2,
  lostTicketSinceMidnight: 0,
  printFailedSinceMidnight: 1,
  printDeadLetterSinceMidnight: 0,
  syncQueuePending: 5,
};

const mockOperationalHealth = {
  overallStatus: "OK",
  apiStatus: "OK",
  databaseStatus: "OK",
  printerStatus: "WARNING",
  lastHeartbeat: "2025-06-01T10:00:00Z",
  outboxPending: 3,
  failedEvents: 0,
  deadLetter: 0,
  lastSuccessfulSync: "2025-06-01T10:00:00Z",
  openCashRegisters: 2,
  recentErrors: [],
};

const mockActiveSession = {
  ticketNumber: "T001",
  plate: "ABC123",
  vehicleType: "CAR",
  entryAt: "2025-06-01T10:00:00Z",
  status: "ACTIVE",
  totalAmount: null,
};

type SwrReturn<T> = {
  data: T | null | undefined;
  error: Error | undefined;
  mutate: ReturnType<typeof vi.fn>;
  isLoading: boolean;
};

const swrState: Record<string, SwrReturn<any>> = {};

vi.mock("swr", () => ({
  default: vi.fn(<T>(key: string): SwrReturn<T> => {
    return swrState[key] ?? { data: undefined, error: undefined, mutate: vi.fn(), isLoading: false };
  }),
}));

function setupSwrMocks() {
  swrState["dashboard-summary"] = {
    data: mockSummary,
    error: undefined,
    mutate: vi.fn(),
    isLoading: false,
  };
  swrState["dashboard-operational"] = {
    data: mockOperationalHealth,
    error: undefined,
    mutate: vi.fn(),
    isLoading: false,
  };
  swrState["dashboard-active-sessions"] = {
    data: [mockActiveSession],
    error: undefined,
    mutate: vi.fn(),
    isLoading: false,
  };
}

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(swrState).forEach((k) => delete swrState[k]);
    setupSwrMocks();
    vi.mocked(fetchDashboardSummary).mockResolvedValue(mockSummary);
    vi.mocked(fetchOperationalHealth).mockResolvedValue(mockOperationalHealth);
    vi.mocked(fetchActiveSessions).mockResolvedValue([mockActiveSession]);
    vi.mocked(postOperationalAction).mockResolvedValue("Acción ejecutada");
  });

  afterEach(() => {
    Object.keys(swrState).forEach((k) => delete swrState[k]);
  });

  it("derives metrics from summary data", () => {
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.metrics).not.toBeNull();
    expect(result.current.metrics?.activeVehicles.value).toBe(45);
    expect(result.current.metrics?.availableSpaces.value).toBe(55);
    expect(result.current.metrics?.availableSpaces.status).toBe("ok");
    expect(result.current.metrics?.occupancyRate.value).toBe(45);
    expect(result.current.metrics?.occupancyRate.status).toBe("ok");
    expect(result.current.metrics?.entriesTotal.value).toBe(30);
    expect(result.current.metrics?.exitsTotal.value).toBe(20);
  });

  it("reports critical available spaces when 0", () => {
    swrState["dashboard-summary"] = {
      data: { ...mockSummary, availableSpaces: 0 },
      error: undefined,
      mutate: vi.fn(),
      isLoading: false,
    };

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.metrics?.availableSpaces.status).toBe("critical");
  });

  it("reports warning spaces when less than 5", () => {
    swrState["dashboard-summary"] = {
      data: { ...mockSummary, availableSpaces: 3 },
      error: undefined,
      mutate: vi.fn(),
      isLoading: false,
    };

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.metrics?.availableSpaces.status).toBe("warning");
  });

  it("reports critical occupancy rate at 90%+", () => {
    swrState["dashboard-summary"] = {
      data: { ...mockSummary, occupancyPercent: 95 },
      error: undefined,
      mutate: vi.fn(),
      isLoading: false,
    };

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.metrics?.occupancyRate.status).toBe("critical");
  });

  it("maps sessions to display format", () => {
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.activeSessions).toHaveLength(1);
    expect(result.current.activeSessions[0].plate).toBe("ABC123");
    expect(result.current.activeSessions[0].type).toBe("CAR");
    expect(result.current.activeSessions[0].status).toBe("Activo");
  });

  it("exposes operational health data", () => {
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.operational).toEqual(mockOperationalHealth);
    expect(result.current.operationalError).toBeNull();
  });

  it("shows error message when summary fetch fails", () => {
    swrState["dashboard-summary"] = {
      data: undefined,
      error: new Error("API error"),
      mutate: vi.fn(),
      isLoading: false,
    };

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.summary).toBeNull();
    expect(result.current.summaryError).toBe("API no disponible (resumen)");
    expect(result.current.metrics).toBeNull();
  });

  it("calls refreshAll triggers all mutate functions", async () => {
    const { result } = renderHook(() => useDashboardData());

    const summaryMutate = swrState["dashboard-summary"].mutate;
    const opsMutate = swrState["dashboard-operational"].mutate;
    const sessionsMutate = swrState["dashboard-active-sessions"].mutate;

    await act(async () => {
      await result.current.refreshAll();
    });

    expect(summaryMutate).toHaveBeenCalled();
    expect(opsMutate).toHaveBeenCalled();
    expect(sessionsMutate).toHaveBeenCalled();
  });

  it("executeOperationalAction calls postOperationalAction and refreshes", async () => {
    const { result } = renderHook(() => useDashboardData());

    const summaryMutate = swrState["dashboard-summary"].mutate;
    const opsMutate = swrState["dashboard-operational"].mutate;
    const sessionsMutate = swrState["dashboard-active-sessions"].mutate;

    await act(async () => {
      await result.current.executeOperationalAction("retry-sync");
    });

    expect(postOperationalAction).toHaveBeenCalledWith("retry-sync");
    expect(result.current.opsMessage).toBe("Acción ejecutada");
    expect(summaryMutate).toHaveBeenCalled();
    expect(opsMutate).toHaveBeenCalled();
    expect(sessionsMutate).toHaveBeenCalled();
  });

  it("sets error message when operational action fails", async () => {
    vi.mocked(postOperationalAction).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useDashboardData());

    await act(async () => {
      await result.current.executeOperationalAction("test-printer");
    });

    expect(result.current.opsMessage).toBe("Error al ejecutar acción");
  });

  it("returns null metrics when summary is null", () => {
    swrState["dashboard-summary"] = {
      data: undefined,
      error: undefined,
      mutate: vi.fn(),
      isLoading: true,
    };

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.metrics).toBeNull();
  });

  it("exposes summaryLoading state", () => {
    swrState["dashboard-summary"] = {
      data: undefined,
      error: undefined,
      mutate: vi.fn(),
      isLoading: true,
    };

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.summaryLoading).toBe(true);
  });
});
