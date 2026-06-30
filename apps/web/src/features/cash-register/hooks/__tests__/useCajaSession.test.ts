import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCajaSession } from "../useCajaSession";

const mockSetSession = vi.hoisted(() => vi.fn());
const mockSetPolicy = vi.hoisted(() => vi.fn());
const mockClearSession = vi.hoisted(() => vi.fn());

const mockCashCurrent = vi.hoisted(() => vi.fn());
const mockCashOpen = vi.hoisted(() => vi.fn());
const mockCashClose = vi.hoisted(() => vi.fn());
const mockCashCount = vi.hoisted(() => vi.fn());
const mockGetAndCacheCashPolicy = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stores/cash-register", () => ({
  useCashRegisterStore: vi.fn((selector) =>
    selector({
      setSession: mockSetSession,
      setPolicy: mockSetPolicy,
      clearSession: mockClearSession,
      session: null,
      policy: null,
      isOpen: false,
    }),
  ),
}));

vi.mock("@/lib/cash/cash-api", () => ({
  cashCurrent: mockCashCurrent,
  cashOpen: mockCashOpen,
  cashClose: mockCashClose,
  cashCount: mockCashCount,
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
  register: { id: "reg-1", site: "Principal", terminal: "T1", label: null },
  operatorId: "user-1",
  operatorName: "Operator",
  status: "OPEN",
  openingAmount: 50000,
  openedAt: "2025-06-01T08:00:00Z",
  closedAt: null,
  closedById: null,
  closedByName: null,
  expectedAmount: 150000,
  countedAmount: null,
  differenceAmount: null,
  countCash: null,
  countCard: null,
  countTransfer: null,
  countOther: null,
  notes: null,
  closingNotes: null,
  closingWitnessName: null,
  supportDocumentNumber: null,
  countedAt: null,
  countOperatorId: null,
  countOperatorName: null,
};

describe("useCajaSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCashCurrent.mockResolvedValue(mockSession);
    mockGetAndCacheCashPolicy.mockResolvedValue(mockPolicy);
  });

  it("fetches session on mount", async () => {
    const { result } = renderHook(() => useCajaSession("Principal", "T1"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockCashCurrent).toHaveBeenCalledWith("Principal", "T1");
    expect(result.current.session).toEqual(mockSession);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockSetSession).toHaveBeenCalledWith(mockSession);
  });

  it("opens a new session", async () => {
    const opened = { ...mockSession, id: "sess-2" };
    mockCashOpen.mockResolvedValue(opened);

    const { result } = renderHook(() => useCajaSession("Principal", "T1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.openSession({
        openingAmount: 75000,
        operatorUserId: "user-1",
        notes: "Apertura de prueba",
      });
    });

    expect(mockCashOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        site: "Principal",
        terminal: "T1",
        openingAmount: 75000,
        operatorUserId: "user-1",
        notes: "Apertura de prueba",
        openIdempotencyKey: expect.any(String),
      }),
    );
    expect(result.current.session).toEqual(opened);
    expect(mockSetSession).toHaveBeenLastCalledWith(opened);
  });

  it("closes the active session", async () => {
    const closed = { ...mockSession, status: "CLOSED" };
    mockCashClose.mockResolvedValue(closed);

    const { result } = renderHook(() => useCajaSession("Principal", "T1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.closeSession({
        closingNotes: "Cierre normal",
        closingWitnessName: "Testigo",
      });
    });

    expect(mockCashClose).toHaveBeenCalledWith(
      "sess-1",
      expect.objectContaining({
        closingNotes: "Cierre normal",
        closingWitnessName: "Testigo",
        closeIdempotencyKey: expect.any(String),
      }),
    );
    expect(result.current.session).toEqual(closed);
  });

  it("counts the active session", async () => {
    const counted = { ...mockSession, countedAmount: 200000 };
    mockCashCount.mockResolvedValue(counted);

    const { result } = renderHook(() => useCajaSession("Principal", "T1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.countSession({
        countCash: 100000,
        countCard: 50000,
        countTransfer: 30000,
        countOther: 20000,
        observations: "Cuadre perfecto",
      });
    });

    expect(mockCashCount).toHaveBeenCalledWith(
      "sess-1",
      expect.objectContaining({
        countCash: 100000,
        countCard: 50000,
        countTransfer: 30000,
        countOther: 20000,
        observations: "Cuadre perfecto",
      }),
    );
    expect(result.current.session).toEqual(counted);
  });

  it("clears the session", async () => {
    const { result } = renderHook(() => useCajaSession("Principal", "T1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.clearSession();
    });

    expect(result.current.session).toBeNull();
    expect(result.current.isOpen).toBe(false);
    expect(mockClearSession).toHaveBeenCalled();
  });

  it("handles load errors", async () => {
    mockCashCurrent.mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() => useCajaSession("Principal", "T1"));

    await waitFor(() => expect(result.current.error).toBe("Network failure"));
    expect(result.current.session).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("does not treat 404/no-active errors as failures", async () => {
    mockCashCurrent.mockRejectedValue(new Error("HTTP 404 No active session"));

    const { result } = renderHook(() => useCajaSession("Principal", "T1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.session).toBeNull();
  });
});
