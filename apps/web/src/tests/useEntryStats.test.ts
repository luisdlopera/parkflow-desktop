import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEntryStats } from "@/features/vehicle-entry/hooks/useEntryStats";

const TODAY_KEY = "parkflow_entries_today";
const SESSION_KEY = "parkflow_entries_session";

describe("useEntryStats", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts at zero when localStorage is empty", () => {
    const { result } = renderHook(() => useEntryStats());
    expect(result.current.stats.today).toBe(0);
    expect(result.current.stats.session).toBe(0);
  });

  it("reads initial values from localStorage", () => {
    localStorage.setItem(TODAY_KEY, "5");
    localStorage.setItem(SESSION_KEY, "3");

    const { result } = renderHook(() => useEntryStats());
    expect(result.current.stats.today).toBe(5);
    expect(result.current.stats.session).toBe(3);
  });

  it("increment increases both counters by 1", () => {
    const { result } = renderHook(() => useEntryStats());

    act(() => {
      result.current.increment();
    });

    expect(result.current.stats.today).toBe(1);
    expect(result.current.stats.session).toBe(1);
  });

  it("increment persists values to localStorage", () => {
    const { result } = renderHook(() => useEntryStats());

    act(() => {
      result.current.increment();
      result.current.increment();
    });

    expect(localStorage.getItem(TODAY_KEY)).toBe("2");
    expect(localStorage.getItem(SESSION_KEY)).toBe("2");
  });

  it("multiple increments accumulate correctly", () => {
    const { result } = renderHook(() => useEntryStats());

    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.increment();
    });

    expect(result.current.stats.today).toBe(3);
    expect(result.current.stats.session).toBe(3);
  });
});
