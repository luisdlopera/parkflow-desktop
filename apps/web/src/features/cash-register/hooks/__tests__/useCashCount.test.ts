import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useCashCount } from "../useCashCount";

describe("useCashCount", () => {
  it("calculates total from denomination rows", () => {
    const rows = [
      { denomination: 50000, quantity: "2" },
      { denomination: 20000, quantity: "1" },
      { denomination: 1000, quantity: "5" },
    ];

    const { result } = renderHook(() => useCashCount(rows));

    expect(result.current.total).toBe(125000);
    expect(result.current.difference(125000)).toBe(0);
    expect(result.current.differenceLabel(125000)).toBe("Cuadre exacto");
    expect(result.current.differenceLabel(120000)).toBe("Sobrante: $5.000");
    expect(result.current.differenceLabel(130000)).toBe("Faltante: $5.000");
  });

  it("handles empty rows", () => {
    const { result } = renderHook(() => useCashCount([]));

    expect(result.current.total).toBe(0);
    expect(result.current.defaultRows()).toHaveLength(11);
    expect(result.current.differenceLabel(0)).toBe("Cuadre exacto");
  });

  it("ignores invalid quantities", () => {
    const rows = [
      { denomination: 10000, quantity: "abc" },
      { denomination: 5000, quantity: "" },
    ];

    const { result } = renderHook(() => useCashCount(rows));

    expect(result.current.total).toBe(0);
  });

  it("exposes COP denominations", () => {
    const { result } = renderHook(() => useCashCount([]));

    expect(result.current.COP_DENOMINATIONS).toContain(50000);
    expect(result.current.COP_DENOMINATIONS).toContain(100);
  });
});
