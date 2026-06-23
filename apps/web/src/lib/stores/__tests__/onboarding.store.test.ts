import { describe, it, expect, beforeEach } from "vitest";
import { useOnboardingStore, type SaveState } from "../onboarding.store";
import type { OnboardingStatus } from "@/lib/onboarding-api";

const initialState = {
  stepData: {},
  stepErrors: {},
  saveState: "idle" as SaveState,
};

beforeEach(() => {
  useOnboardingStore.setState(initialState);
});

const mockStatus: OnboardingStatus = {
  companyId: "company-1",
  plan: "PRO",
  onboardingCompleted: false,
  currentStep: 2,
  skipped: false,
  progressData: {
    step_2: { name: "My Parking", address: "123 Main St" },
  },
  availableOptionsByPlan: {},
  enabledSteps: [1, 2, 3],
};

describe("useOnboardingStore", () => {
  it("has correct initial state", () => {
    const state = useOnboardingStore.getState();
    expect(state.stepData).toEqual({});
    expect(state.stepErrors).toEqual({});
    expect(state.saveState).toBe("idle");
  });

  describe("setStepData", () => {
    it("replaces stepData with a direct value", () => {
      useOnboardingStore.getState().setStepData({ name: "Test", active: true });
      expect(useOnboardingStore.getState().stepData).toEqual({ name: "Test", active: true });
    });

    it("merges stepData using a function updater", () => {
      useOnboardingStore.setState({ stepData: { name: "Old" } });
      useOnboardingStore.getState().setStepData((prev) => ({ ...prev, address: "New" }));
      expect(useOnboardingStore.getState().stepData).toEqual({ name: "Old", address: "New" });
    });

    it("overwrites stepData completely when passing an object", () => {
      useOnboardingStore.setState({ stepData: { old: "data" } });
      useOnboardingStore.getState().setStepData({ fresh: "data" });
      expect(useOnboardingStore.getState().stepData).toEqual({ fresh: "data" });
    });
  });

  describe("updateStepField (via setStepData + function)", () => {
    it("updates a single field without removing others", () => {
      useOnboardingStore.setState({ stepData: { name: "Test", address: "123 St" } });
      useOnboardingStore.getState().setStepData((prev) => ({ ...prev, name: "Updated" }));
      expect(useOnboardingStore.getState().stepData).toEqual({ name: "Updated", address: "123 St" });
    });
  });

  describe("clearStepErrors", () => {
    it("clears all step errors", () => {
      useOnboardingStore.setState({ stepErrors: { name: "Required", address: "Invalid" } });
      useOnboardingStore.getState().clearStepErrors();
      expect(useOnboardingStore.getState().stepErrors).toEqual({});
    });

    it("is idempotent when already empty", () => {
      useOnboardingStore.getState().clearStepErrors();
      expect(useOnboardingStore.getState().stepErrors).toEqual({});
    });
  });

  describe("saveState", () => {
    it("starts as idle", () => {
      expect(useOnboardingStore.getState().saveState).toBe("idle");
    });

    it("transitions to saving via setSaveState", () => {
      useOnboardingStore.getState().setSaveState("saving");
      expect(useOnboardingStore.getState().saveState).toBe("saving");
    });

    it("transitions to saved via setSaveState", () => {
      useOnboardingStore.getState().setSaveState("saved");
      expect(useOnboardingStore.getState().saveState).toBe("saved");
    });

    it("transitions to error via setSaveState", () => {
      useOnboardingStore.getState().setSaveState("error");
      expect(useOnboardingStore.getState().saveState).toBe("error");
    });

    it("supports function updater for setSaveState", () => {
      useOnboardingStore.setState({ saveState: "saving" });
      useOnboardingStore.getState().setSaveState(() => "saved");
      expect(useOnboardingStore.getState().saveState).toBe("saved");
    });
  });

  describe("resetStore (via setState)", () => {
    it("resets to initial state", () => {
      useOnboardingStore.setState({
        stepData: { name: "Test" },
        stepErrors: { name: "Required" },
        saveState: "saved",
      });
      useOnboardingStore.setState(initialState);
      const state = useOnboardingStore.getState();
      expect(state.stepData).toEqual({});
      expect(state.stepErrors).toEqual({});
      expect(state.saveState).toBe("idle");
    });
  });

  describe("loadStepFromStatus", () => {
    it("loads stepData from status progressData", () => {
      useOnboardingStore.getState().loadStepFromStatus(mockStatus, 2);
      expect(useOnboardingStore.getState().stepData).toEqual({
        name: "My Parking",
        address: "123 Main St",
      });
    });

    it("clears stepErrors when loading", () => {
      useOnboardingStore.setState({ stepErrors: { name: "Required" } });
      useOnboardingStore.getState().loadStepFromStatus(mockStatus, 2);
      expect(useOnboardingStore.getState().stepErrors).toEqual({});
    });

    it("sets empty stepData when step not in progressData", () => {
      useOnboardingStore.getState().loadStepFromStatus(mockStatus, 99);
      expect(useOnboardingStore.getState().stepData).toEqual({});
    });
  });
});
