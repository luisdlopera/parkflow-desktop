import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCajaMovements } from "../useCajaMovements";

const mockCashMovements = vi.hoisted(() => vi.fn());
const mockCashSummary = vi.hoisted(() => vi.fn());
const mockCashAddMovement = vi.hoisted(() => vi.fn());
const mockCashVoidMovement = vi.hoisted(() => vi.fn());

vi.mock("@/lib/cash/cash-api", () => ({
  cashMovements: mockCashMovements,
  cashSummary: mockCashSummary,
  cashAddMovement: mockCashAddMovement,
  cashVoidMovement: mockCashVoidMovement,
}));

const mockMovements = [
  {
    id: "mov-1",
    cashSessionId: "sess-1",
    movementType: "INCOME",
    paymentMethod: "CASH",
    amount: 10000,
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
  },
];

const mockSummary = {
  openingAmount: 50000,
  expectedLedgerTotal: 150000,
  countedTotal: null,
  difference: null,
  totalsByPaymentMethod: { CASH: 10000 },
  totalsByMovementType: { INCOME: 10000 },
  movementCount: 1,
};

describe("useCajaMovements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCashMovements.mockResolvedValue(mockMovements);
    mockCashSummary.mockResolvedValue(mockSummary);
  });

  it("fetches movements and summary", async () => {
    const { result } = renderHook(() => useCajaMovements("sess-1"));

    expect(result.current.movements).toEqual([]);
    expect(result.current.summary).toBeNull();

    await act(async () => {
      await result.current.load();
    });

    expect(result.current.loading).toBe(false);
    expect(mockCashMovements).toHaveBeenCalledWith("sess-1");
    expect(mockCashSummary).toHaveBeenCalledWith("sess-1");
    expect(result.current.movements).toEqual(mockMovements);
    expect(result.current.summary).toEqual(mockSummary);
  });

  it("adds a movement and refreshes data", async () => {
    const newMovement = { ...mockMovements[0], id: "mov-2" };
    mockCashAddMovement.mockResolvedValue(newMovement);

    const { result } = renderHook(() => useCajaMovements("sess-1"));

    await act(async () => {
      const returned = await result.current.addMovement({
        type: "INCOME",
        paymentMethod: "CASH",
        amount: 25000,
        reason: "Pago mensualidad",
      });
      expect(returned).toEqual(newMovement);
    });

    expect(mockCashAddMovement).toHaveBeenCalledWith(
      "sess-1",
      expect.objectContaining({
        type: "INCOME",
        paymentMethod: "CASH",
        amount: 25000,
        reason: "Pago mensualidad",
      }),
      undefined,
    );
    expect(mockCashMovements).toHaveBeenCalledTimes(1);
    expect(result.current.movements).toEqual(mockMovements);
  });

  it("voids a movement and refreshes data", async () => {
    const voided = { ...mockMovements[0], status: "VOIDED", voidReason: "Error corregido" };
    mockCashVoidMovement.mockResolvedValue(voided);

    const { result } = renderHook(() => useCajaMovements("sess-1"));

    await act(async () => {
      const returned = await result.current.voidMovement("mov-1", "Error corregido");
      expect(returned).toEqual(voided);
    });

    expect(mockCashVoidMovement).toHaveBeenCalledWith(
      "sess-1",
      "mov-1",
      "Error corregido",
      "void:mov-1",
    );
    expect(mockCashMovements).toHaveBeenCalledTimes(1);
  });

  it("handles errors when loading", async () => {
    mockCashMovements.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useCajaMovements("sess-1"));

    await act(async () => {
      await result.current.load();
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.loading).toBe(false);
  });

  it("does nothing when sessionId is null", async () => {
    const { result } = renderHook(() => useCajaMovements(null));

    await act(async () => {
      await result.current.load();
    });

    expect(mockCashMovements).not.toHaveBeenCalled();
    expect(result.current.movements).toEqual([]);
  });
});
