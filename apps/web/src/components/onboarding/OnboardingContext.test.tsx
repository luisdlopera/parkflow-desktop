import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OnboardingProvider, useOnboardingNavigation, useOnboardingData } from "./OnboardingContext";
import { useOnboardingStore } from "@/lib/stores/onboarding.store";
import * as onboardingApi from "@/lib/api/onboarding.api";
import { toast } from "@heroui/react";
import React from "react";
import * as useOnboardingStatusHook from "@/hooks/auth/useOnboardingStatus";

vi.mock("@/lib/api/onboarding.api", () => ({
  saveOnboardingStep: vi.fn(),
}));

vi.mock("@/hooks/auth/useOnboardingStatus", () => ({
  useOnboardingStatus: vi.fn(),
}));

vi.mock("@heroui/react", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    toast: {
      danger: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      clear: vi.fn(),
      close: vi.fn(),
      promise: vi.fn(),
    },
  };
});

describe("OnboardingContext (Autosave & Errors)", () => {
  const companyId = "test-company";
  const mockMutate = vi.fn();
  
  beforeEach(() => {
    vi.useFakeTimers();
    useOnboardingStore.setState({
      stepData: {},
      stepErrors: {},
      saveState: "idle",
    });
    
    vi.mocked(useOnboardingStatusHook.useOnboardingStatus).mockReturnValue({
      data: {
        companyId,
        plan: "PRO",
        onboardingCompleted: false,
        currentStep: 1,
        skipped: false,
        progressData: {},
        availableOptionsByPlan: {},
        enabledSteps: [1, 2, 3],
      } as any,
      isLoading: false,
      mutate: mockMutate,
      error: undefined,
      isValidating: false,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <OnboardingProvider companyId={companyId} onDone={vi.fn()}>
      {children}
    </OnboardingProvider>
  );

  it("should trigger autosave every 10 seconds if stepData changed", async () => {
    vi.mocked(onboardingApi.saveOnboardingStep).mockResolvedValue({ currentStep: 1 } as any);

    const { result } = renderHook(() => useOnboardingData(), { wrapper });

    act(() => {
      result.current.setStepData({ test: "data" });
    });

    await act(async () => {
      vi.advanceTimersByTime(10000);
      await Promise.resolve();
    });

    expect(onboardingApi.saveOnboardingStep).toHaveBeenCalledWith(
      companyId,
      1,
      { test: "data" },
      1,
      expect.any(Object)
    );
  });

  it("should handle save errors gracefully: set saveState, show toast, rollback", async () => {
    vi.mocked(onboardingApi.saveOnboardingStep).mockRejectedValue(new Error("400: Network Error"));

    const { result } = renderHook(() => {
      return {
        nav: useOnboardingNavigation(),
        data: useOnboardingData(),
      };
    }, { wrapper });

    act(() => {
      result.current.data.setStepData({ will: "fail" });
    });

    await act(async () => {
      await result.current.nav.persistStep(2).catch(() => {});
    });

    // 1. saveState must be "error"
    expect(useOnboardingStore.getState().saveState).toBe("error");

    // 2. Toast must be shown (regardless of step number)
    expect(toast.danger).toHaveBeenCalledOnce();
    const toastArgs = vi.mocked(toast.danger).mock.calls[0];
    expect(toastArgs[0]).toBe("No se pudo guardar la configuración");
    expect(toastArgs[1]?.timeout).toBe(8000);

    // 3. Must rollback current step (not advance)
    expect(useOnboardingStore.getState().stepData).toEqual({});

    // 4. saveState resets to idle after 3s
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(useOnboardingStore.getState().saveState).toBe("idle");
  });

  it("should show toast for any step error (not just step 2)", async () => {
    vi.mocked(onboardingApi.saveOnboardingStep).mockRejectedValue(new Error("Validation failed"));

    const { result } = renderHook(() => useOnboardingNavigation(), { wrapper });

    // Try saving on step 1 — should also show toast
    await act(async () => {
      await result.current.persistStep(2).catch(() => {});
    });

    // Step number doesn't matter — toast must be shown
    expect(toast.danger).toHaveBeenCalledWith(
      "No se pudo guardar la configuración",
      expect.objectContaining({ timeout: 8000 })
    );
  });

  it("should sort enabled steps so caja comes before tarifas", async () => {
    vi.mocked(useOnboardingStatusHook.useOnboardingStatus).mockReturnValue({
      data: {
        companyId,
        plan: "PRO",
        onboardingCompleted: false,
        currentStep: 2,
        skipped: false,
        progressData: {},
        availableOptionsByPlan: {},
        enabledSteps: [1, 2, 3, 4],
      } as any,
      isLoading: false,
      mutate: mockMutate,
      error: undefined,
      isValidating: false,
    });

    const { result } = renderHook(() => useOnboardingNavigation(), { wrapper });

    expect(result.current.enabledSteps).toEqual([1, 2, 4, 3]);
  });
});
