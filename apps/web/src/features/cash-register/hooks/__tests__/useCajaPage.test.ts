import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCajaPage } from "../useCajaPage";
import { cashRegisters, cashAudit, cashPrintClosing } from "@/lib/cash/cash-api";
import { fetchConfigurationSites } from "@/lib/api/sites-api";
import { listCashOutboxPending } from "@/lib/cash/cash-outbox-idb";
import { flushCashMovementOutbox } from "@/lib/cash/cash-sync";
import { currentUser, hasPermission } from "@/lib/services/auth-domain.service";
import { printCashThermalReceipt, startLocalPrintQueueWorker } from "@/lib/print/print-service";
import { buildCashCountTicket, buildCashMovementTicket } from "@/lib/cash/cash-print";

const mockOpenSession = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockCloseSession = vi.hoisted(() => vi.fn().mockResolvedValue({ status: "CLOSED" }));
const mockCountSession = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockReloadSession = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLoadMovements = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockAddMovement = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockVoidMovement = vi.hoisted(() => vi.fn().mockResolvedValue({}));

const mockUseCajaSession = vi.hoisted(() => vi.fn());
const mockUseCajaMovements = vi.hoisted(() => vi.fn());
const mockUseCajaForms = vi.hoisted(() => vi.fn());

vi.mock("@/lib/cash/cash-api", () => ({
  cashRegisters: vi.fn(),
  cashAudit: vi.fn(),
  cashPrintClosing: vi.fn(),
  cashCurrent: vi.fn(),
  cashOpen: vi.fn(),
  cashClose: vi.fn(),
  cashCount: vi.fn(),
  cashAddMovement: vi.fn(),
  cashVoidMovement: vi.fn(),
  cashMovements: vi.fn(),
  cashSummary: vi.fn(),
}));

vi.mock("@/lib/api/sites-api", () => ({
  fetchConfigurationSites: vi.fn(),
}));

vi.mock("@/lib/cash/cash-outbox-idb", () => ({
  listCashOutboxPending: vi.fn(),
  enqueueCashMovementOffline: vi.fn(),
}));

vi.mock("@/lib/cash/cash-sync", () => ({
  flushCashMovementOutbox: vi.fn(),
}));

vi.mock("@/lib/services/auth-domain.service", () => ({
  currentUser: vi.fn(),
  hasPermission: vi.fn(),
}));

vi.mock("@/lib/print/print-service", () => ({
  printCashThermalReceipt: vi.fn(),
  startLocalPrintQueueWorker: vi.fn(),
}));

vi.mock("@/lib/cash/cash-print", () => ({
  buildCashCountTicket: vi.fn(() => ({ ticketId: "count-1" })),
  buildCashMovementTicket: vi.fn(() => ({ ticketId: "mov-1" })),
}));

vi.mock("@/lib/errors/error-messages", () => ({
  getUserFriendlyErrorMessage: vi.fn((_e: unknown, action: string) => `Error en ${action}`),
  FrontendActionError: { CASH_OPERATION: "CASH_OPERATION", PRINT_ACTION: "PRINT_ACTION" },
}));

vi.mock("../useCajaSession", () => ({ useCajaSession: mockUseCajaSession }));
vi.mock("../useCajaMovements", () => ({ useCajaMovements: mockUseCajaMovements }));
vi.mock("../useCajaForms", () => ({ useCajaForms: mockUseCajaForms }));

const mockSessionOpen = {
  id: "sess-1",
  status: "OPEN",
  register: { id: "reg-1", site: "Principal", terminal: "T1", label: null },
  operatorId: "user-1",
  operatorName: "Operator",
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

const mockMovements = [{
  id: "mov-1",
  cashSessionId: "sess-1",
  movementType: "INCOME",
  paymentMethod: "CASH",
  amount: 50000,
  parkingSessionId: null,
  reason: null,
  metadata: null,
  status: "ACTIVE",
  voidedAt: null,
  voidReason: null,
  voidedById: null,
  externalReference: null,
  createdById: "user-1",
  createdByName: "Operator",
  createdAt: "2025-06-01T10:00:00Z",
  terminal: "T1",
  idempotencyKey: "ik-1",
}];

const mockSummary = {
  openingAmount: 50000,
  expectedLedgerTotal: 150000,
  countedTotal: null,
  difference: null,
  totalsByPaymentMethod: { CASH: 100000 },
  totalsByMovementType: { INCOME: 100000 },
  movementCount: 1,
};

const mockPolicy = {
  requireOpenForPayment: true,
  offlineCloseAllowed: true,
  offlineMaxManualMovement: 200000,
  operationsHint: "Opere con normalidad",
  resolvedForSite: "Principal",
};

const mockUser = { id: "user-1", name: "Operator", email: "op@test.com" };

function defaultCajaSessionMock(overrides?: Record<string, unknown>) {
  return {
    session: mockSessionOpen,
    policy: mockPolicy,
    loading: false,
    error: null,
    isOpen: true,
    reload: mockReloadSession,
    openSession: mockOpenSession,
    countSession: mockCountSession,
    closeSession: mockCloseSession,
    clearSession: vi.fn(),
    setError: vi.fn(),
    ...overrides,
  };
}

function defaultCajaMovementsMock(overrides?: Record<string, unknown>) {
  return {
    movements: mockMovements,
    summary: mockSummary,
    loading: false,
    error: null,
    load: mockLoadMovements,
    addMovement: mockAddMovement,
    voidMovement: mockVoidMovement,
    ...overrides,
  };
}

function defaultCajaFormsMock(overrides?: Record<string, unknown>) {
  return {
    manualForm: {
      setValue: vi.fn(),
      reset: vi.fn(),
      getValues: vi.fn().mockReturnValue({}),
    },
    countForm: { getValues: vi.fn() },
    openForm: {
      reset: vi.fn(),
      getValues: vi.fn((key?: string) => {
        const vals: Record<string, string> = { openNotes: "" };
        return key ? vals[key] : vals;
      }),
    },
    closeForm: {
      reset: vi.fn(),
      getValues: vi.fn((key?: string) => {
        const vals: Record<string, string> = { closeNotes: "" };
        return key ? vals[key] : vals;
      }),
    },
    voidForm: {
      reset: vi.fn(),
      getValues: vi.fn((key?: string) => {
        const vals: Record<string, string> = { voidReason: "Error corregido" };
        return key ? vals[key] : vals;
      }),
    },
    shiftForm: { getValues: vi.fn() },
    manualType: "INCOME",
    manualMethod: "CASH",
    countCash: "0",
    countCard: "0",
    countTransfer: "0",
    countOther: "0",
    countNotes: "",
    ...overrides,
  };
}

describe("useCajaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cashRegisters).mockResolvedValue([
      { id: "reg-1", site: "Principal", terminal: "T1", label: null },
    ]);
    vi.mocked(cashAudit).mockResolvedValue([]);
    vi.mocked(cashPrintClosing).mockResolvedValue({
      documentType: "CASH_CLOSING",
      ticketDocument: {},
      previewLines: [],
    });
    vi.mocked(fetchConfigurationSites).mockResolvedValue({ totalElements: 1 } as any);
    vi.mocked(listCashOutboxPending).mockResolvedValue([]);
    vi.mocked(flushCashMovementOutbox).mockResolvedValue(undefined);
    vi.mocked(currentUser).mockResolvedValue(mockUser as any);
    vi.mocked(hasPermission).mockResolvedValue(true);

    process.env.NEXT_PUBLIC_TERMINAL_ID = "T1";
    process.env.NEXT_PUBLIC_PARKING_SITE = "Principal";

    mockUseCajaSession.mockReturnValue(defaultCajaSessionMock());
    mockUseCajaMovements.mockReturnValue(defaultCajaMovementsMock());
    mockUseCajaForms.mockReturnValue(defaultCajaFormsMock());
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_TERMINAL_ID;
    delete process.env.NEXT_PUBLIC_PARKING_SITE;
  });

  it("loads session and site data on mount", async () => {
    renderHook(() => useCajaPage());

    await waitFor(() => {
      expect(cashRegisters).toHaveBeenCalled();
      expect(fetchConfigurationSites).toHaveBeenCalled();
      expect(startLocalPrintQueueWorker).toHaveBeenCalled();
      expect(listCashOutboxPending).toHaveBeenCalled();
      expect(flushCashMovementOutbox).toHaveBeenCalled();
    });
  });

  it("exposes session state and derived flags", () => {
    const { result } = renderHook(() => useCajaPage());

    expect(result.current.session).toEqual(mockSessionOpen);
    expect(result.current.policy).toEqual(mockPolicy);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.closed).toBe(false);
  });

  it("exposes movements and summary", () => {
    const { result } = renderHook(() => useCajaPage());

    expect(result.current.allMovements).toEqual(mockMovements);
    expect(result.current.summary).toEqual(mockSummary);
  });

  it("opens cash session via onOpen", async () => {
    const { result } = renderHook(() => useCajaPage());

    await act(async () => {
      result.current.setTerminal("T1");
    });

    await act(async () => {
      await result.current.onOpen();
    });

    expect(mockOpenSession).toHaveBeenCalledWith(
      expect.objectContaining({
        openingAmount: 0,
        operatorUserId: mockUser.id,
      }),
    );
    expect(mockReloadSession).toHaveBeenCalled();
  });

  it("rejects open when no terminal configured", async () => {
    delete process.env.NEXT_PUBLIC_TERMINAL_ID;
    const origGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = vi.fn().mockReturnValue(null);

    const { result } = renderHook(() => useCajaPage());

    await act(async () => {
      await result.current.onOpen();
    });

    expect(result.current.error).toBe("Terminal obligatorio");
    Storage.prototype.getItem = origGetItem;
  });

  it("closes session via onClose", async () => {
    // Mock session with countedAt set so count is not required
    mockUseCajaSession.mockReturnValue(
      defaultCajaSessionMock({ session: { ...mockSessionOpen, countedAt: "2025-06-01T17:00:00Z" } }),
    );

    const confirmFn = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useCajaPage());

    await act(async () => {
      await result.current.onClose(confirmFn);
    });

    expect(confirmFn).toHaveBeenCalled();
    expect(mockCloseSession).toHaveBeenCalled();
  });

  it("requires count before closing", async () => {
    const confirmFn = vi.fn().mockResolvedValue(true);
    mockUseCajaSession.mockReturnValue(
      defaultCajaSessionMock({ session: { ...mockSessionOpen, countedAt: null } }),
    );

    const { result } = renderHook(() => useCajaPage());

    await act(async () => {
      await result.current.onClose(confirmFn);
    });

    expect(result.current.error).toBe("Debe realizar el arqueo antes de cerrar la caja.");
    expect(confirmFn).not.toHaveBeenCalled();
  });

  it("handles manual movement addition", async () => {
    const { result } = renderHook(() => useCajaPage());

    await act(async () => {
      await result.current.onAddManual({
        manualType: "INCOME",
        manualMethod: "CASH",
        manualAmount: "50000",
        manualReason: "Pago mensualidad",
      } as any);
    });

    expect(mockAddMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "INCOME",
        paymentMethod: "CASH",
        amount: 50000,
      }),
      expect.any(Object),
    );
  });

  it("performs cash count via onCount", async () => {
    const { result } = renderHook(() => useCajaPage());

    await act(async () => {
      await result.current.onCount({
        countCash: "100000",
        countCard: "50000",
        countTransfer: "0",
        countOther: "0",
        countNotes: "",
      } as any);
    });

    expect(mockCountSession).toHaveBeenCalledWith(
      expect.objectContaining({
        countCash: 100000,
        countCard: 50000,
        countTransfer: 0,
        countOther: 0,
      }),
    );
  });

  it("requires observations when count differs from expected", async () => {
    mockUseCajaMovements.mockReturnValue(
      defaultCajaMovementsMock({
        summary: { ...mockSummary, expectedLedgerTotal: 150000 },
      }),
    );

    const { result } = renderHook(() => useCajaPage());

    await act(async () => {
      await result.current.onCount({
        countCash: "100",
        countCard: "0",
        countTransfer: "0",
        countOther: "0",
        countNotes: "",
      } as any);
    });

    expect(result.current.error).toContain("Hay diferencia");
  });

  it("handles void movement", async () => {
    const { result } = renderHook(() => useCajaPage());

    act(() => {
      result.current.setVoidTarget("mov-1");
    });

    await act(async () => {
      await result.current.onVoid();
    });

    expect(mockVoidMovement).toHaveBeenCalledWith("mov-1", "Error corregido");
  });

  it("handles errors gracefully in onOpen", async () => {
    mockOpenSession.mockRejectedValue(new Error("API error"));

    const { result } = renderHook(() => useCajaPage());

    await act(async () => {
      await result.current.onOpen();
    });

    expect(result.current.error).toBe("Error en CASH_OPERATION");
  });

  it("filters movements by type", () => {
    const { result } = renderHook(() => useCajaPage());

    act(() => {
      result.current.setFilterType("INCOME");
    });

    expect(result.current.movements).toHaveLength(1);
  });

  it("prints closing document", async () => {
    const { result } = renderHook(() => useCajaPage());

    await act(async () => {
      await result.current.onPrintClosing();
    });

    expect(cashPrintClosing).toHaveBeenCalledWith("sess-1");
    expect(printCashThermalReceipt).toHaveBeenCalled();
  });

  it("shifts change by closing session and resetting open amount", async () => {
    mockUseCajaSession.mockReturnValue(
      defaultCajaSessionMock({
        closeSession: mockCloseSession,
        reload: mockReloadSession,
        clearSession: vi.fn(),
        session: { ...mockSessionOpen, countedAt: "2025-06-01T17:00:00Z" },
      }),
    );

    const { result } = renderHook(() => useCajaPage());

    await act(async () => {
      await result.current.onShiftChange();
    });

    expect(mockCloseSession).toHaveBeenCalled();
  });
});
