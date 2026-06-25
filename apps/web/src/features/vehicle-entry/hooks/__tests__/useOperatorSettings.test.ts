import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOperatorSettings } from "@/features/vehicle-entry/hooks/useOperatorSettings";

const STORAGE_KEY = "parkflow_operator_settings";

describe("useOperatorSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default settings when localStorage is empty", () => {
    const { result } = renderHook(() => useOperatorSettings());
    expect(result.current.settings.mode).toBe("beginner");
    expect(result.current.settings.defaultVehicleType).toBe("CAR");
    expect(result.current.settings.rememberLocation).toBe(true);
    expect(result.current.settings.skipConditionCheck).toBe(false);
    expect(result.current.settings.platePrefix).toBe("");
  });

  it("reads saved settings from localStorage", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: "expert", defaultVehicleType: "MOTORCYCLE", rememberLocation: false, skipConditionCheck: true, platePrefix: "TMP" })
    );

    const { result } = renderHook(() => useOperatorSettings());
    expect(result.current.settings.mode).toBe("expert");
    expect(result.current.settings.defaultVehicleType).toBe("MOTORCYCLE");
    expect(result.current.settings.rememberLocation).toBe(false);
  });

  it("falls back to defaults when stored JSON is invalid", () => {
    localStorage.setItem(STORAGE_KEY, "not-valid-json{{{");
    const { result } = renderHook(() => useOperatorSettings());
    expect(result.current.settings.mode).toBe("beginner");
  });

  it("update merges partial changes", () => {
    const { result } = renderHook(() => useOperatorSettings());

    act(() => {
      result.current.update({ mode: "speed", skipConditionCheck: true });
    });

    expect(result.current.settings.mode).toBe("speed");
    expect(result.current.settings.skipConditionCheck).toBe(true);
    expect(result.current.settings.defaultVehicleType).toBe("CAR");
  });

  it("update persists to localStorage", () => {
    const { result } = renderHook(() => useOperatorSettings());

    act(() => {
      result.current.update({ platePrefix: "TEST" });
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.platePrefix).toBe("TEST");
  });
});
