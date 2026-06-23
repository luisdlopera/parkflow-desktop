import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useSplitPayment } from "../useSplitPayment";

describe("useSplitPayment", () => {
  it("starts with two empty rows for the given methods", () => {
    const { result } = renderHook(() => useSplitPayment(10000, "CASH", "NEQUI"));

    expect(result.current.splitPayments).toHaveLength(2);
    expect(result.current.splitPayments[0].method).toBe("CASH");
    expect(result.current.splitPayments[1].method).toBe("NEQUI");
    expect(result.current.splitTotal).toBe(0);
    expect(result.current.splitRemaining).toBe(10000);
    expect(result.current.splitCashReceived).toBe(0);
  });

  it("adds a new payment row", () => {
    const { result } = renderHook(() => useSplitPayment(10000));

    act(() => {
      result.current.addRow();
    });

    expect(result.current.splitPayments).toHaveLength(3);
    expect(result.current.splitPayments[2].amount).toBe("");
  });

  it("calculates totals from row amounts", () => {
    const { result } = renderHook(() => useSplitPayment(10000));

    act(() => {
      result.current.updateRow("split-1", { amount: "6000" });
      result.current.updateRow("split-2", { amount: "4000" });
    });

    expect(result.current.splitTotal).toBe(10000);
    expect(result.current.splitRemaining).toBe(0);
    expect(result.current.splitCashReceived).toBe(6000);
  });

  it("validates that at least two rows have a positive amount", () => {
    const { result } = renderHook(() => useSplitPayment(10000));

    act(() => {
      result.current.updateRow("split-1", { amount: "10000" });
    });

    expect(result.current.validate()).toContain("al menos dos medios");
  });

  it("validates that the split total matches the amount due", () => {
    const { result } = renderHook(() => useSplitPayment(10000));

    act(() => {
      result.current.updateRow("split-1", { amount: "3000" });
      result.current.updateRow("split-2", { amount: "2000" });
    });

    const error = result.current.validate();
    expect(error).toContain("debe sumar $10.000");
    expect(error).toContain("Falta $5.000");
  });

  it("returns null when the split is valid", () => {
    const { result } = renderHook(() => useSplitPayment(10000));

    act(() => {
      result.current.updateRow("split-1", { amount: "6000" });
      result.current.updateRow("split-2", { amount: "4000" });
    });

    expect(result.current.validate()).toBeNull();
  });

  it("removes a payment row", () => {
    const { result } = renderHook(() => useSplitPayment(10000));

    act(() => {
      result.current.addRow();
    });
    expect(result.current.splitPayments).toHaveLength(3);

    const removedId = result.current.splitPayments[2].id;
    act(() => {
      result.current.removeRow(removedId);
    });

    expect(result.current.splitPayments).toHaveLength(2);
    expect(result.current.splitPayments.find((r) => r.id === removedId)).toBeUndefined();
  });

  it("resets to the original two rows", () => {
    const { result } = renderHook(() => useSplitPayment(10000, "CASH", "NEQUI"));

    act(() => {
      result.current.addRow();
      result.current.updateRow("split-1", { amount: "5000" });
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.splitPayments).toHaveLength(2);
    expect(result.current.splitPayments[0].method).toBe("CASH");
    expect(result.current.splitPayments[1].method).toBe("NEQUI");
    expect(result.current.splitTotal).toBe(0);
  });

  it("ignores invalid amounts when calculating totals", () => {
    const { result } = renderHook(() => useSplitPayment(10000));

    act(() => {
      result.current.updateRow("split-1", { amount: "abc" });
      result.current.updateRow("split-2", { amount: "" });
    });

    expect(result.current.splitTotal).toBe(0);
    expect(result.current.splitRemaining).toBe(10000);
  });
});
