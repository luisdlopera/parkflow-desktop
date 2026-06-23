import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useColumnVisibility } from "../useColumnVisibility";

const STORAGE_KEY = "parkflow-vehicles-columns";

describe("useColumnVisibility", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with default visible columns", () => {
    const { result } = renderHook(() => useColumnVisibility());

    expect(result.current.isVisible("plate")).toBe(true);
    expect(result.current.isVisible("ticketNumber")).toBe(true);
    expect(result.current.isVisible("rateName")).toBe(false);
    expect(result.current.isVisible("actions")).toBe(true);
  });

  it("toggles column visibility", () => {
    const { result } = renderHook(() => useColumnVisibility());

    act(() => {
      result.current.toggleColumn("rateName");
    });
    expect(result.current.isVisible("rateName")).toBe(true);

    act(() => {
      result.current.toggleColumn("plate");
    });
    expect(result.current.isVisible("plate")).toBe(false);
  });

  it("persists visibility to localStorage", () => {
    const { result } = renderHook(() => useColumnVisibility());

    act(() => {
      result.current.toggleColumn("rateName");
      result.current.toggleColumn("plate");
    });

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    expect(saved).toContain("rateName");
    expect(saved).not.toContain("plate");
    expect(saved).toContain("ticketNumber");
  });

  it("loads persisted state on mount", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["plate", "ticketNumber", "rateName"]));

    const { result } = renderHook(() => useColumnVisibility());

    expect(result.current.isVisible("plate")).toBe(true);
    expect(result.current.isVisible("rateName")).toBe(true);
    expect(result.current.isVisible("vehicleType")).toBe(false);
  });

  it("resets columns to defaults", () => {
    const { result } = renderHook(() => useColumnVisibility());

    act(() => {
      result.current.toggleColumn("rateName");
      result.current.toggleColumn("plate");
    });

    act(() => {
      result.current.resetColumns();
    });

    expect(result.current.isVisible("plate")).toBe(true);
    expect(result.current.isVisible("rateName")).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toContain("plate");
  });

  it("falls back to defaults when localStorage is corrupted", () => {
    localStorage.setItem(STORAGE_KEY, "not-json");

    const { result } = renderHook(() => useColumnVisibility());

    expect(result.current.isVisible("plate")).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBe("not-json");
  });
});
