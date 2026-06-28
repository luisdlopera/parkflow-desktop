import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OnboardingProvider, useOnboardingNavigation, useOnboardingData } from "./OnboardingContext";
import { useOnboardingStore } from "@/lib/stores/onboarding.store";
import * as onboardingApi from "@/lib/api/onboarding.api";
import React from "react";
import * as useOnboardingStatusHook from "@/hooks/auth/useOnboardingStatus";

vi.mock("@/lib/api/onboarding.api", () => ({
  saveOnboardingStep: vi.fn(),
}));

vi.mock("@/hooks/auth/useOnboardingStatus", () => ({
  useOnboardingStatus: vi.fn(),
}));

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

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    await waitFor(
      () => {
        expect(onboardingApi.saveOnboardingStep).toHaveBeenCalledWith(
          companyId,
          1,
          { test: "data" },
          1
        );
      },
      { timeout: 10000 }
    );
  }, 15000);

  it("should handle save errors gracefully and set saveState to error", async () => {
    vi.mocked(onboardingApi.saveOnboardingStep).mockRejectedValue(new Error("Network Error"));

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

    expect(useOnboardingStore.getState().saveState).toBe("error");

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(useOnboardingStore.getState().saveState).toBe("idle");
  });
});
