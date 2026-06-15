"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { fetchOnboardingStatus, saveOnboardingStep, OnboardingStatus } from "@/lib/onboarding-api";

export type OperationalProfile = "MOTORCYCLE_ONLY" | "CAR_ONLY" | "MIXED";

export const REQUIRED_STEPS = [1, 2, 3, 4, 6];
export const BASE_ENABLED_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12];
export const STEP_TITLES = [
  "Tipos de vehículo",
  "Capacidad",
  "Tarifas",
  "Caja",
  "Turnos",
  "Métodos de pago",
  "Tickets",
  "Clientes y mensualidades",
  "Convenios",
  "Sedes",
  "Roles y permisos",
  "Auditoría",
];

export const VEHICLE_OPTIONS: Array<{ code: string; label: string; description: string }> = [
  { code: "MOTORCYCLE", label: "Moto", description: "Motocicletas y ciclomotores" },
  { code: "CAR", label: "Carro", description: "Automóviles y sedanes" },
  { code: "BICYCLE", label: "Bicicleta", description: "Bicicletas (no requiere placa)" },
  { code: "VAN", label: "Camioneta", description: "Camionetas, SUVs y vans" },
  { code: "TRUCK", label: "Camión", description: "Camiones de carga" },
  { code: "BUS", label: "Bus", description: "Buses y transporte público" },
  { code: "OTHER", label: "Otro", description: "Vehículos especiales o no categorizados" },
];

export const PAYMENT_OPTIONS = [
  { code: "CASH", label: "Efectivo" },
  { code: "DEBIT_CARD", label: "Tarjeta débito" },
  { code: "CREDIT_CARD", label: "Tarjeta crédito" },
  { code: "NEQUI", label: "Nequi" },
  { code: "DAVIPLATA", label: "DaviPlata" },
  { code: "TRANSFER", label: "Transferencia" },
  { code: "QR", label: "Pago QR" },
  { code: "AGREEMENT", label: "Convenio" },
  { code: "MIXED", label: "Mixto" },
];

export const COUNTRY_OPTIONS = [
  { code: "CO", label: "Colombia", platePattern: "ABC123", plateExample: "ABC123" },
  { code: "MX", label: "México", platePattern: "ABC1234", plateExample: "ABC1234" },
  { code: "AR", label: "Argentina", platePattern: "AB123CD", plateExample: "AB123CD" },
  { code: "CL", label: "Chile", platePattern: "ABCD12", plateExample: "ABCD12" },
  { code: "PE", label: "Perú", platePattern: "ABC123", plateExample: "ABC123" },
  { code: "US", label: "Estados Unidos", platePattern: "ABC1234", plateExample: "ABC1234" },
  { code: "OTHER", label: "Otro", platePattern: "Libre", plateExample: "Libre" },
];

export const PRINTER_OPTIONS = [
  { code: "THERMAL", label: "Impresora térmica", description: "Tiquetes pequeños y rápidos" },
  { code: "DESKJET", label: "Impresora de escritorio", description: "Tiquetes normales" },
  { code: "NONE", label: "Sin impresora", description: "Solo pantalla o digital" },
];

export type StepValidationErrors = Record<string, string>;

export function isStepCompleted(progressData: Record<string, unknown>, step: number) {
  const stepKey = `step_${step}`;
  const data = progressData?.[stepKey] as Record<string, unknown> | undefined;
  if (!data) return false;
  return validateStep(
    step,
    data,
    Array.isArray(data.vehicleTypes) ? (data.vehicleTypes as string[]) : [],
  ).isValid;
}

export function validateStep(
  step: number,
  data: Record<string, unknown>,
  vehicleTypes: string[],
): { isValid: boolean; errors: StepValidationErrors } {
  const errors: StepValidationErrors = {};

  switch (step) {
    case 1: {
      if (!Array.isArray(data.vehicleTypes) || (data.vehicleTypes as string[]).length === 0) {
        errors.vehicleTypes = "Selecciona al menos un tipo de vehículo.";
      }
      const selectedTypes = Array.isArray(data.vehicleTypes)
        ? (data.vehicleTypes as string[])
        : vehicleTypes;
      if (selectedTypes.includes("MOTORCYCLE")) {
        const handling = data.helmetHandling;
        if (handling !== "TOKENS" && handling !== "LOCKER" && handling !== "NONE") {
          errors.helmetHandling = "Selecciona una opción de custodia de cascos.";
        }
        if (handling === "TOKENS") {
          const count =
            typeof data.helmetTokenCount === "number"
              ? data.helmetTokenCount
              : Number(data.helmetTokenCount);
          if (!Number.isFinite(count) || count <= 0) {
            errors.helmetTokenCount = "La cantidad de fichas debe ser mayor a 0.";
          } else if (count > 9999) {
            errors.helmetTokenCount = "La cantidad de fichas no puede superar 9999.";
          }
        }
      }
      break;
    }
    case 2: {
      const total =
        typeof data.totalCapacity === "number" ? data.totalCapacity : Number(data.totalCapacity);
      if (!Number.isFinite(total) || total <= 0) {
        errors.totalCapacity = "La capacidad total debe ser mayor a 0.";
      }
      if (Boolean(data.controlSlots)) {
        const byType = (data.capacityByType as Record<string, number>) ?? {};
        const selectedTypes = vehicleTypes.length > 0 ? vehicleTypes : Object.keys(byType);
        const sum = selectedTypes.reduce((acc, type) => acc + (Number(byType[type]) || 0), 0);
        if (Number.isFinite(total) && sum > total) {
          errors.capacityByType = `La suma de capacidades por tipo (${sum}) supera la capacidad total (${total}).`;
        }
      }
      break;
    }
    case 3: {
      const base = typeof data.baseValue === "number" ? data.baseValue : Number(data.baseValue);
      if (!Number.isFinite(base) || base <= 0) {
        errors.baseValue = "La tarifa base debe ser mayor a 0.";
      }
      break;
    }
    case 4: {
      if (typeof data.countryCode !== "string" || data.countryCode.length === 0) {
        errors.countryCode = "Selecciona un país.";
      }
      break;
    }
    case 6: {
      if (!Array.isArray(data.paymentMethods) || (data.paymentMethods as string[]).length === 0) {
        errors.paymentMethods = "Selecciona al menos un método de pago.";
      }
      break;
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export function areRequiredStepsCompleted(progressData: Record<string, unknown>) {
  return REQUIRED_STEPS.every((step) => isStepCompleted(progressData, step));
}

export function getNextEnabledStep(current: number, enabledSteps: number[]) {
  const idx = enabledSteps.indexOf(current);
  if (idx === -1 || idx === enabledSteps.length - 1) return current;
  return enabledSteps[idx + 1];
}

export function getPrevEnabledStep(current: number, enabledSteps: number[]) {
  const idx = enabledSteps.indexOf(current);
  if (idx <= 0) return current;
  return enabledSteps[idx - 1];
}

export function inferOperationalProfile(vehicleTypes: string[]): OperationalProfile {
  const hasMoto = vehicleTypes.includes("MOTORCYCLE");
  const hasCar = vehicleTypes.includes("CAR");
  const hasOthers = vehicleTypes.some((v) => v !== "MOTORCYCLE" && v !== "CAR");

  if (hasMoto && !hasCar && !hasOthers) return "MOTORCYCLE_ONLY";
  if (hasCar && !hasMoto && !hasOthers) return "CAR_ONLY";
  return "MIXED";
}

export function profileLabel(profile: OperationalProfile): string {
  switch (profile) {
    case "MOTORCYCLE_ONLY":
      return "Parqueadero de motos";
    case "CAR_ONLY":
      return "Parqueadero de carros";
    case "MIXED":
      return "Parqueadero mixto";
  }
}

export function profileDescription(profile: OperationalProfile): string {
  switch (profile) {
    case "MOTORCYCLE_ONLY":
      return "La interfaz se adaptará solo para ingreso de motocicletas.";
    case "CAR_ONLY":
      return "La interfaz se adaptará solo para ingreso de automóviles.";
    case "MIXED":
      return "La interfaz mostrará opciones para todos los tipos de vehículos seleccionados.";
  }
}

interface OnboardingContextType {
  companyId: string;
  status: OnboardingStatus | null;
  stepData: Record<string, unknown>;
  setStepData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  loading: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  setSaveState: React.Dispatch<React.SetStateAction<"idle" | "saving" | "saved" | "error">>;
  step: number;
  enabledSteps: number[];
  totalEnabledSteps: number;
  persistStep: (targetStep: number) => Promise<void>;
  requiredCompleted: boolean;
  vehicleTypes: string[];
  detectedProfile: OperationalProfile;
  getCapacityByType: () => Record<string, number>;
  getRatesByType: () => Record<string, number>;
  onDone: () => void;
  canMultiSite: boolean;
  canAdvancedPermissions: boolean;
  progress: number;
  allProgressData: Record<string, unknown>;
  stepErrors: StepValidationErrors;
  validateCurrentStep: () => boolean;
  clearStepErrors: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({
  children,
  companyId,
  onDone,
}: {
  children: ReactNode;
  companyId: string;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [stepData, setStepData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [stepErrors, setStepErrors] = useState<StepValidationErrors>({});

  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedData = useRef<string>("");
  const isSavingRef = useRef<boolean>(false);

  useEffect(() => {
    fetchOnboardingStatus(companyId).then((s) => {
      const safeStep = s.enabledSteps?.includes(s.currentStep)
        ? s.currentStep
        : (s.enabledSteps?.[0] ?? 1);
      const statusWithSafeStep = { ...s, currentStep: safeStep };
      setStatus(statusWithSafeStep);
      const payload = (s.progressData?.[`step_${safeStep}`] as Record<string, unknown>) ?? {};
      setStepData(payload);
      lastSavedData.current = JSON.stringify(payload);
      setLoading(false);
      if (s.onboardingCompleted) onDone();
    });
  }, [companyId, onDone]);

  const step = status?.currentStep ?? 1;
  const enabledSteps = useMemo(
    () => status?.enabledSteps ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    [status?.enabledSteps],
  );
  const totalEnabledSteps = enabledSteps.length;

  const progress = useMemo(() => {
    const idx = enabledSteps.indexOf(step);
    if (idx === -1) return 0;
    return Math.round(((idx + 1) / totalEnabledSteps) * 100);
  }, [step, enabledSteps, totalEnabledSteps]);

  const requiredCompleted = useMemo(
    () => areRequiredStepsCompleted(status?.progressData ?? {}),
    [status?.progressData],
  );

  const canMultiSite = Boolean(status?.availableOptionsByPlan?.allowMultiLocation);
  const canAdvancedPermissions = Boolean(status?.availableOptionsByPlan?.allowAdvancedPermissions);

  const vehicleTypes = useMemo(() => {
    const step1Data = status?.progressData?.step_1 as Record<string, unknown> | undefined;
    return Array.isArray(step1Data?.vehicleTypes) ? (step1Data.vehicleTypes as string[]) : [];
  }, [status?.progressData]);

  const detectedProfile = useMemo(() => inferOperationalProfile(vehicleTypes), [vehicleTypes]);

  // Auto-save silencioso cada 10 segundos
  useEffect(() => {
    if (autoSaveRef.current) {
      clearInterval(autoSaveRef.current);
    }

    autoSaveRef.current = setInterval(() => {
      if (!status || !stepData || Object.keys(stepData).length === 0 || isSavingRef.current) return;

      const currentData = JSON.stringify(stepData);
      if (currentData === lastSavedData.current) return;

      isSavingRef.current = true;
      setSaveState("saving");
      saveOnboardingStep(companyId, step, stepData, step)
        .then((next) => {
          setStatus({ ...next, currentStep: step });
          lastSavedData.current = currentData; // ACTUALIZADO DENTRO DE THEN
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 2000);
        })
        .catch(() => {
          setSaveState("error");
          setTimeout(() => setSaveState("idle"), 3000);
        })
        .finally(() => {
          isSavingRef.current = false;
        });
    }, 10000);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [companyId, step, status, stepData]);

  const persistStep = async (targetStep: number) => {
    if (!status || isSavingRef.current) return;
    isSavingRef.current = true;
    setSaveState("saving");
    try {
      const safeStep = enabledSteps.includes(targetStep)
        ? targetStep
        : targetStep > step
          ? getNextEnabledStep(step, enabledSteps)
          : getPrevEnabledStep(step, enabledSteps);

      const next = await saveOnboardingStep(companyId, step, stepData, safeStep);
      setStatus({ ...next, currentStep: safeStep });
      const payload = (next.progressData?.[`step_${safeStep}`] as Record<string, unknown>) ?? {};
      setStepData(payload);
      lastSavedData.current = JSON.stringify(payload);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    } finally {
      isSavingRef.current = false;
    }
  };

  const getCapacityByType = useCallback(() => {
    const existing = (stepData.capacityByType as Record<string, number>) ?? {};
    return VEHICLE_OPTIONS.reduce(
      (acc, v) => {
        acc[v.code] = existing[v.code] ?? 0;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [stepData.capacityByType]);

  const getRatesByType = useCallback(() => {
    const existing = (stepData.ratesByType as Record<string, number>) ?? {};
    return VEHICLE_OPTIONS.reduce(
      (acc, v) => {
        acc[v.code] = existing[v.code] ?? (stepData.baseValue as number) ?? 0;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [stepData.ratesByType, stepData.baseValue]);

  const validateCurrentStep = useCallback(() => {
    const result = validateStep(step, stepData, vehicleTypes);
    setStepErrors(result.errors);
    return result.isValid;
  }, [step, stepData, vehicleTypes]);

  const clearStepErrors = useCallback(() => {
    setStepErrors({});
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        companyId,
        status,
        stepData,
        setStepData,
        loading,
        saveState,
        setSaveState,
        step,
        enabledSteps,
        totalEnabledSteps,
        persistStep,
        requiredCompleted,
        vehicleTypes,
        detectedProfile,
        getCapacityByType,
        getRatesByType,
        onDone,
        canMultiSite,
        canAdvancedPermissions,
        progress,
        allProgressData: status?.progressData ?? {},
        stepErrors,
        validateCurrentStep,
        clearStepErrors,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
