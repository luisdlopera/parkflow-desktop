import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useExitLookup } from "../useExitLookup";
import type { PaymentMethodCode } from "@/lib/payment-method-catalog";

const mockGetSearchParam = vi.hoisted(() => vi.fn());
const mockLookupActiveSession = vi.hoisted(() => vi.fn());
const mockPlaySuccess = vi.hoisted(() => vi.fn());
const mockPlayError = vi.hoisted(() => vi.fn());
const mockResetSplitPayment = vi.hoisted(() => vi.fn());
const mockGetUserFriendlyErrorMessage = vi.hoisted(() => vi.fn((err: unknown) => (err instanceof Error ? err.message : "Error")));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGetSearchParam }),
}));

vi.mock("@/features/vehicle-exit/services/vehicle-exit.service", () => ({
  lookupActiveSession: mockLookupActiveSession,
}));

vi.mock("@/hooks/ui/useOperationSounds", () => ({
  useOperationSounds: () => ({ playSuccess: mockPlaySuccess, playError: mockPlayError }),
}));

const mockNormalize = vi.hoisted(() => vi.fn((err: unknown) => ({ message: err instanceof Error ? err.message : "Error" })));

vi.mock("@/lib/errors/error-service", () => ({
  errorService: { normalize: mockNormalize },
}));

const availableMethods = [
  { code: "CASH" as PaymentMethodCode, label: "Efectivo", hint: "", tone: "" },
  { code: "NEQUI" as PaymentMethodCode, label: "Nequi", hint: "", tone: "" },
];

const mockActive = {
  sessionId: "sess-1",
  subtotal: 8000,
  surcharge: 0,
  discount: 0,
  total: 10000,
  receipt: {
    ticketNumber: "T001",
    plate: "ABC123",
    vehicleType: "CAR",
    duration: "1h",
    totalAmount: 10000,
    rateName: "Hora",
    status: "ACTIVE",
    lostTicket: false,
    reprintCount: 0,
    agreementCode: "CONV-1",
    custodiedItems: [],
  },
};

function okResponse(payload: unknown) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

function errorResponse(message: string) {
  return {
    ok: false,
    json: vi.fn().mockResolvedValue({ userMessage: message }),
  } as unknown as Response;
}

describe("useExitLookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSearchParam.mockReturnValue(null);
    mockLookupActiveSession.mockResolvedValue(okResponse(mockActive));
  });

  it("looks up a session by ticket number", async () => {
    const { result } = renderHook(() => useExitLookup(availableMethods as any, mockResetSplitPayment));

    act(() => {
      result.current.setTicketNumber("T001");
    });

    await act(async () => {
      await result.current.lookup();
    });

    expect(mockLookupActiveSession).toHaveBeenCalledWith("T001", "", undefined);
    expect(result.current.active).toEqual(mockActive);
    expect(result.current.error).toBe("");
    expect(mockPlaySuccess).toHaveBeenCalled();
    expect(mockResetSplitPayment).toHaveBeenCalledWith("CASH", "NEQUI");
  });

  it("looks up a session by plate", async () => {
    const { result } = renderHook(() => useExitLookup(availableMethods as any, mockResetSplitPayment));

    act(() => {
      result.current.setPlate("ABC123");
    });

    await act(async () => {
      await result.current.lookup();
    });

    expect(mockLookupActiveSession).toHaveBeenCalledWith("", "ABC123", undefined);
    expect(result.current.active).toEqual(mockActive);
  });

  it("looks up with an agreement code override", async () => {
    const { result } = renderHook(() => useExitLookup(availableMethods as any, mockResetSplitPayment));

    act(() => {
      result.current.setTicketNumber("T001");
      result.current.setAgreementCode("CONV-2");
    });

    await act(async () => {
      await result.current.lookup();
    });

    expect(mockLookupActiveSession).toHaveBeenCalledWith("T001", "", "CONV-2");
  });

  it("resets lookup state", async () => {
    const { result } = renderHook(() => useExitLookup(availableMethods as any, mockResetSplitPayment));

    act(() => {
      result.current.setTicketNumber("T001");
      result.current.setPlate("ABC123");
    });

    await act(async () => {
      await result.current.lookup();
    });

    expect(result.current.active).not.toBeNull();

    act(() => {
      result.current.resetLookup();
    });

    expect(result.current.active).toBeNull();
    expect(result.current.ticketNumber).toBe("");
    expect(result.current.plate).toBe("");
    expect(result.current.agreementCode).toBe("");
  });

  it("auto-looks up from URL query params", async () => {
    mockGetSearchParam.mockImplementation((key: string) => (key === "ticketNumber" ? "T001" : null));

    const { result } = renderHook(() => useExitLookup(availableMethods as any, mockResetSplitPayment));

    await waitFor(() => expect(result.current.active).not.toBeNull());

    expect(mockLookupActiveSession).toHaveBeenCalledWith("T001", "", undefined);
  });

  it("shows an error when the lookup response is not ok", async () => {
    mockLookupActiveSession.mockResolvedValue(errorResponse("No se encontró sesión activa"));

    const { result } = renderHook(() => useExitLookup(availableMethods as any, mockResetSplitPayment));

    act(() => {
      result.current.setTicketNumber("T001");
    });

    await act(async () => {
      await result.current.lookup();
    });

    expect(result.current.active).toBeNull();
    expect(result.current.error).toBe("No se encontró sesión activa");
    expect(mockPlayError).toHaveBeenCalled();
  });

  it("shows a friendly error when the lookup throws", async () => {
    mockLookupActiveSession.mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() => useExitLookup(availableMethods as any, mockResetSplitPayment));

    act(() => {
      result.current.setTicketNumber("T001");
    });

    await act(async () => {
      await result.current.lookup();
    });

    expect(result.current.active).toBeNull();
    expect(result.current.error).toBe("Network failure");
    expect(mockNormalize).toHaveBeenCalledWith(expect.any(Error));
    expect(mockPlayError).toHaveBeenCalled();
  });

  it("requires a ticket or plate to lookup", async () => {
    const { result } = renderHook(() => useExitLookup(availableMethods as any, mockResetSplitPayment));

    await act(async () => {
      await result.current.lookup();
    });

    expect(mockLookupActiveSession).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Ingresa ticket o placa");
  });

  it("toggles return confirmation for custodied items", async () => {
    const { result } = renderHook(() => useExitLookup(availableMethods as any, mockResetSplitPayment));

    act(() => {
      result.current.toggleReturnItem("item-1", true);
    });
    expect(result.current.returnConfirmedIds).toContain("item-1");

    act(() => {
      result.current.toggleReturnItem("item-1", false);
    });
    expect(result.current.returnConfirmedIds).not.toContain("item-1");
  });
});
