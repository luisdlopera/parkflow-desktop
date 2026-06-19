import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSelectOptions } from "./useSelectOptions";

describe("useSelectOptions", () => {
  it("maps items to select options using default id/name", () => {
    const items = [
      { id: "1", name: "Option 1" },
      { id: "2", name: "Option 2" },
    ];
    const { result } = renderHook(() => useSelectOptions(items));
    expect(result.current).toEqual([
      { value: "1", label: "Option 1" },
      { value: "2", label: "Option 2" },
    ]);
  });

  it("uses custom keyFn and labelFn", () => {
    const items = [
      { code: "A", title: "Alpha" },
      { code: "B", title: "Beta" },
    ];
    const { result } = renderHook(() =>
      useSelectOptions(items, (i) => i.code, (i) => i.title)
    );
    expect(result.current).toEqual([
      { value: "A", label: "Alpha" },
      { value: "B", label: "Beta" },
    ]);
  });

  it("handles empty array", () => {
    const { result } = renderHook(() => useSelectOptions([]));
    expect(result.current).toEqual([]);
  });

  it("memoizes result based on items array", () => {
    const items = [{ id: "1", name: "Test" }];
    const { result, rerender } = renderHook(
      ({ items: i }) => useSelectOptions(i),
      { initialProps: { items } }
    );
    const firstResult = result.current;
    rerender({ items });
    expect(result.current).toBe(firstResult); // Same reference = memoized
  });
});
