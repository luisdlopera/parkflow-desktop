"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { useOnboardingStore } from "@/lib/stores/onboarding.store";
import { useOnboardingStatus } from "@/hooks/auth/useOnboardingStatus";
import { saveOnboardingStep, type OnboardingStatus } from "@/lib/api/onboarding.api";
import { toast } from "@heroui/react";
import { errorService } from "@/lib/errors/error-service";
import {
  REQUIRED_STEPS,
  VEHICLE_OPTIONS,
  validateStep,
  areRequiredStepsCompleted,
  inferOperationalProfile,
  getNextEnabledStep,
  getPrevEnabledStep,
  sortEnabledSteps,
  ONBOARDING_STEP_ORDER,
} from "./onboarding-logic";

// Re-export all pure logic (constants, validators, navigation helpers, types)
// so existing imports from "@/components/onboarding/OnboardingContext" keep
// working without touching the 12 step components or the wizard.
export * from "./onboarding-logic";

const DEFAULT_ENABLED_STEPS = ONBOARDING_STEP_ORDER;

// ─── Helper: show a user‑friendly toast for any onboarding API error ────────
function showOnboardingError(err: unknown) {
  const pfError = errorService.normalize(err);
  const description = pfError.message || "Revisa los datos e intenta nuevamente.";

  toast.danger("No se pudo guardar la configuración", {
    description,
    timeout: 8000,
  });
}

// ─── Internal context for server state ───────────────────────────────────────
// Holds the SWR-managed OnboardingStatus and the actions that touch the server.
// The 3 public hooks read from this context so they never need to know about SWR.

type OnboardingServerCtx = {
  companyId: string;
  status: OnboardingStatus | null;
  isLoading: boolean;
  persistStep: (targetStep: number) => Promise<void>;
  onDone: () => void;
};

const OnboardingServerContext = createContext<OnboardingServerCtx | null>(null);

function useOnboardingServerCtx(): OnboardingServerCtx {
  const ctx = useContext(OnboardingServerContext);
  if (!ctx) throw new Error("useOnboardingServerCtx must be used inside OnboardingProvider");
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function OnboardingProvider({
  children,
  companyId,
  onDone,
}: {
  children: ReactNode;
  companyId: string;
  onDone: () => void;
}) {
  // Server state via SWR — handles caching, dedup, and invalidation after saves
  const { data: status, isLoading, mutate } = useOnboardingStatus(companyId);

  // Client state from Zustand
  const stepData = useOnboardingStore((s) => s.stepData);
  const saveState = useOnboardingStore((s) => s.saveState);
  const setSaveState = useOnboardingStore((s) => s.setSaveState);
  const loadStepFromStatus = useOnboardingStore((s) => s.loadStepFromStatus);

  // Track the last step we loaded so we only hydrate stepData on step changes
  const loadedStepRef = useRef<number | null>(null);
  // Track last persisted JSON for autosave dedup (reset when step changes)
  const lastSavedDataRef = useRef<string>("");

  useEffect(() => {
    if (!status || isLoading) return;
    if (status.onboardingCompleted) { onDone(); return; }

    if (loadedStepRef.current !== status.currentStep) {
      loadedStepRef.current = status.currentStep;
      const fresh =
        (status.progressData?.[`step_${status.currentStep}`] as Record<string, unknown>) ?? {};
      loadStepFromStatus(status, status.currentStep);
      lastSavedDataRef.current = JSON.stringify(fresh);
    }
  }, [status, isLoading, onDone, loadStepFromStatus]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const autosaveErrorCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Saves current step and navigates to targetStep. Updates SWR cache directly
  // via mutate(next, false) to avoid a redundant re-fetch.
  const persistStep = useCallback(
    async (targetStep: number) => {
      if (!status) return;

      // Abort any ongoing save request (either from autosave or previous click)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort("New save request initiated");
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      const step = status.currentStep ?? 1;
      const enabledSteps = sortEnabledSteps(status.enabledSteps ?? DEFAULT_ENABLED_STEPS);
      const safeTarget = enabledSteps.includes(targetStep)
        ? targetStep
        : targetStep > step
          ? getNextEnabledStep(step, enabledSteps)
          : getPrevEnabledStep(step, enabledSteps);

      setSaveState("saving");
      try {
        const next = await saveOnboardingStep(companyId, step, stepData, safeTarget, { signal });
        await mutate(next, false);
        loadStepFromStatus(next, safeTarget);
        lastSavedDataRef.current = JSON.stringify(
          (next.progressData?.[`step_${safeTarget}`] as Record<string, unknown>) ?? {}
        );
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch (err: any) {
        if (err.name === "AbortError") return; // Ignored if aborted
        setSaveState("error");
        setTimeout(() => setSaveState("idle"), 3000);

        showOnboardingError(err);

        // If 403 Forbidden, the admin likely changed the plan constraints.
        // Force a strict re-fetch of the status to get the updated allowed steps.
        if (err?.response?.status === 403 || err?.status === 403) {
          await mutate(); // Re-fetch from server
        } else {
          // Rollback on other errors
          await mutate(status, false);
          loadStepFromStatus(status, status.currentStep ?? 1);
        }
      } finally {
        if (abortControllerRef.current?.signal === signal) {
          abortControllerRef.current = null;
        }
      }
    },
    [status, stepData, companyId, mutate, loadStepFromStatus, setSaveState]
  );

  // Stable 10s autosave — only fires when stepData has actually changed
  useEffect(() => {
    const id = setInterval(() => {
      if (!status) return;
      const current = JSON.stringify(stepData);
      if (current === lastSavedDataRef.current) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort("New autosave request initiated");
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setSaveState("saving");
      saveOnboardingStep(companyId, status.currentStep, stepData, status.currentStep, { signal })
        .then(async (next) => {
          await mutate(next, false);
          lastSavedDataRef.current = current;
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 2000);
        })
        .catch((err: any) => {
          if (err.name === "AbortError") return;
          setSaveState("error");
          setTimeout(() => setSaveState("idle"), 3000);
          if (!autosaveErrorCooldownRef.current) {
            showOnboardingError(err);
            autosaveErrorCooldownRef.current = setTimeout(() => {
              autosaveErrorCooldownRef.current = null;
            }, 30_000);
          }
          if (err?.response?.status === 403 || err?.status === 403) {
            mutate();
          }
        })
        .finally(() => {
          if (abortControllerRef.current?.signal === signal) {
            abortControllerRef.current = null;
          }
        });
    }, 10_000);
    return () => clearInterval(id);
  }, [stepData, status, companyId, mutate, setSaveState]);

  const serverCtxValue = useMemo<OnboardingServerCtx>(
    () => ({ companyId, status: status ?? null, isLoading, persistStep, onDone }),
    [companyId, status, isLoading, persistStep, onDone]
  );

  return (
    <OnboardingServerContext.Provider value={serverCtxValue}>
      {children}
    </OnboardingServerContext.Provider>
  );
}

// ─── Specialized hooks for granular subscriptions ───
// Each hook subscribes only to the slices it needs to prevent unnecessary re-renders.

export function useOnboardingNavigation() {
  const { status, persistStep, onDone } = useOnboardingServerCtx();

  const step = status?.currentStep ?? 1;
  const enabledSteps = useMemo(
    () => sortEnabledSteps(status?.enabledSteps ?? DEFAULT_ENABLED_STEPS),
    [status?.enabledSteps]
  );
  const totalEnabledSteps = enabledSteps.length;
  const progress = useMemo(() => {
    const idx = enabledSteps.indexOf(step);
    if (idx === -1) return 0;
    return Math.round(((idx + 1) / totalEnabledSteps) * 100);
  }, [step, enabledSteps, totalEnabledSteps]);

  return useMemo(
    () => ({ step, enabledSteps, totalEnabledSteps, progress, persistStep, onDone }),
    [step, enabledSteps, totalEnabledSteps, progress, persistStep, onDone]
  );
}

export function useOnboardingData() {
  const { status } = useOnboardingServerCtx();

  const stepData = useOnboardingStore((s) => s.stepData);
  const setStepData = useOnboardingStore((s) => s.setStepData);
  const stepErrors = useOnboardingStore((s) => s.stepErrors);
  const validateStepData = useOnboardingStore((s) => s.validateStepData);
  const clearStepErrors = useOnboardingStore((s) => s.clearStepErrors);

  // Derive vehicleTypes from the status progressData for validation
  const vehicleTypes = useMemo(() => {
    const step1 = status?.progressData?.step_1 as Record<string, unknown> | undefined;
    return Array.isArray(step1?.vehicleTypes) ? (step1!.vehicleTypes as string[]) : [];
  }, [status?.progressData]);

  // Wrap with current step + vehicleTypes so callers use the same no-arg API
  const validateCurrentStep = useCallback(
    () => validateStepData(status?.currentStep ?? 1, vehicleTypes),
    [validateStepData, status?.currentStep, vehicleTypes]
  );

  const getCapacityByType = useCallback(() => {
    const existing = (stepData.capacityByType as Record<string, number>) ?? {};
    return VEHICLE_OPTIONS.reduce(
      (acc, v) => {
        acc[v.code] = existing[v.code] ?? 0;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [stepData.capacityByType]);

  const getRatesByType = useCallback(() => {
    const existing = (stepData.ratesByType as Record<string, number>) ?? {};
    return VEHICLE_OPTIONS.reduce(
      (acc, v) => {
        acc[v.code] = existing[v.code] ?? (stepData.baseValue as number) ?? 0;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [stepData.ratesByType, stepData.baseValue]);

  return useMemo(
    () => ({
      stepData,
      setStepData,
      stepErrors,
      validateCurrentStep,
      clearStepErrors,
      getCapacityByType,
      getRatesByType,
    }),
    [
      stepData,
      setStepData,
      stepErrors,
      validateCurrentStep,
      clearStepErrors,
      getCapacityByType,
      getRatesByType,
    ]
  );
}

export function useOnboardingMetadata() {
  const { companyId, status, isLoading } = useOnboardingServerCtx();

  const saveState = useOnboardingStore((s) => s.saveState);
  const setSaveState = useOnboardingStore((s) => s.setSaveState);
  const stepData = useOnboardingStore((s) => s.stepData);

  const vehicleTypes = useMemo(() => {
    const step1 = status?.progressData?.step_1 as Record<string, unknown> | undefined;
    return Array.isArray(step1?.vehicleTypes) ? (step1!.vehicleTypes as string[]) : [];
  }, [status?.progressData]);

  const step = status?.currentStep ?? 1;
  const requiredCompleted = useMemo(() => {
    const progressData = { ...(status?.progressData ?? {}) };
    if (REQUIRED_STEPS.includes(step) && validateStep(step, stepData, vehicleTypes).isValid) {
      progressData[`step_${step}`] = stepData;
    }
    return areRequiredStepsCompleted(progressData);
  }, [status?.progressData, step, stepData, vehicleTypes]);

  const detectedProfile = useMemo(() => inferOperationalProfile(vehicleTypes), [vehicleTypes]);
  const canMultiSite = Boolean(status?.availableOptionsByPlan?.allowMultiLocation);
  const canAdvancedPermissions = Boolean(status?.availableOptionsByPlan?.allowAdvancedPermissions);
  const allProgressData = useMemo(() => status?.progressData ?? {}, [status?.progressData]);

  return useMemo(
    () => ({
      companyId,
      status,
      loading: isLoading,
      saveState,
      setSaveState,
      requiredCompleted,
      vehicleTypes,
      detectedProfile,
      canMultiSite,
      canAdvancedPermissions,
      allProgressData,
    }),
    [
      companyId,
      status,
      isLoading,
      saveState,
      setSaveState,
      requiredCompleted,
      vehicleTypes,
      detectedProfile,
      canMultiSite,
      canAdvancedPermissions,
      allProgressData,
    ]
  );
}

// ─── Aggregate hook for backward compatibility ───
export function useOnboarding() {
  const nav = useOnboardingNavigation();
  const data = useOnboardingData();
  const meta = useOnboardingMetadata();

  return useMemo(
    () => ({ ...nav, ...data, ...meta }),
    [nav, data, meta]
  );
}
