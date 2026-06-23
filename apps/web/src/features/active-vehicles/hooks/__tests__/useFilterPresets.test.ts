import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useFilterPresets } from "../useFilterPresets";

const STORAGE_KEY = "parkflow-vehicles-filter-presets";

describe("useFilterPresets", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("crypto", { randomUUID: () => "preset-id-1" });
  });

  it("starts with an empty preset list", () => {
    const { result } = renderHook(() => useFilterPresets());

    expect(result.current.presets).toEqual([]);
  });

  it("adds a preset", () => {
    const { result } = renderHook(() => useFilterPresets());

    act(() => {
      result.current.savePreset("Mi filtro", { plate: "ABC", type: "CAR" });
    });

    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0]).toMatchObject({
      id: "preset-id-1",
      name: "Mi filtro",
      filters: { plate: "ABC", type: "CAR" },
    });
  });

  it("deletes a preset", () => {
    const { result } = renderHook(() => useFilterPresets());

    act(() => {
      result.current.savePreset("Para borrar", { plate: "XYZ" });
    });

    act(() => {
      result.current.deletePreset("preset-id-1");
    });

    expect(result.current.presets).toHaveLength(0);
  });

  it("updates a preset filters", () => {
    const { result } = renderHook(() => useFilterPresets());

    act(() => {
      result.current.savePreset("Original", { plate: "ABC" });
    });

    act(() => {
      result.current.updatePreset("preset-id-1", { plate: "DEF", type: "MOTO" });
    });

    expect(result.current.presets[0].filters).toEqual({ plate: "DEF", type: "MOTO" });
  });

  it("persists presets to localStorage", () => {
    const { result } = renderHook(() => useFilterPresets());

    act(() => {
      result.current.savePreset("Persistido", { plate: "AAA" });
    });

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("Persistido");
  });

  it("loads persisted presets on mount", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: "p-1",
          name: "Cargado",
          filters: { plate: "BBB" },
          createdAt: "2025-06-01T00:00:00.000Z",
        },
      ]),
    );

    const { result } = renderHook(() => useFilterPresets());

    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0].name).toBe("Cargado");
  });

  it("clears corrupted localStorage and starts empty", () => {
    localStorage.setItem(STORAGE_KEY, "invalid json");

    const { result } = renderHook(() => useFilterPresets());

    expect(result.current.presets).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBe("invalid json");
  });
});
