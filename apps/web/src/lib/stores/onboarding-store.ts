import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";
import { type OnboardingStatus } from "@/lib/onboarding-api";
import {
  validateStep,
  type StepValidationErrors,
} from "@/components/onboarding/onboarding-logic";

export type SaveState = "idle" | "saving" | "saved" | "error";

interface OnboardingClientStore {
  // ── Form state ──
  stepData: Record<string, unknown>;
  stepErrors: StepValidationErrors;
  saveState: SaveState;

  // ── Actions ──
  setStepData: Dispatch<SetStateAction<Record<string, unknown>>>;
  setSaveState: Dispatch<SetStateAction<SaveState>>;
  clearStepErrors: () => void;
  /** Validates the given step against current stepData. Sets stepErrors as a side effect. */
  validateStepData: (step: number, vehicleTypes: string[]) => boolean;
  /** Loads the step payload from a freshly-fetched OnboardingStatus into stepData. */
  loadStepFromStatus: (status: OnboardingStatus, step: number) => void;
}

export const useOnboardingStore = create<OnboardingClientStore>((set, get) => ({
  stepData: {},
  stepErrors: {},
  saveState: "idle",

  setStepData: (update) => {
    set((state) => ({
      stepData:
        typeof update === "function"
          ? (update as (prev: Record<string, unknown>) => Record<string, unknown>)(state.stepData)
          : update,
    }));
  },

  setSaveState: (update) => {
    set((state) => ({
      saveState:
        typeof update === "function"
          ? (update as (prev: SaveState) => SaveState)(state.saveState)
          : update,
    }));
  },

  clearStepErrors: () => set({ stepErrors: {} }),

  validateStepData: (step, vehicleTypes) => {
    const { stepData } = get();
    const result = validateStep(step, stepData, vehicleTypes);
    set({ stepErrors: result.errors });
    return result.isValid;
  },

  loadStepFromStatus: (status, step) => {
    const payload =
      (status.progressData?.[`step_${step}`] as Record<string, unknown>) ?? {};
    set({ stepData: payload, stepErrors: {} });
  },
}));
