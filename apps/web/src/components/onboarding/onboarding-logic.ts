// Pure (non-React) onboarding logic: constants, validation and navigation
// helpers. Extracted from OnboardingContext.tsx so both the Zustand store and
// the React layer can share it without import cycles. OnboardingContext.tsx
// re-exports everything here, so existing imports from "../OnboardingContext"
// keep working unchanged.

import { PAYMENT_OPTIONS_FOR_ONBOARDING } from "@/lib/payment-method-catalog";

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
  "Revisión final",
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

export const PAYMENT_OPTIONS = PAYMENT_OPTIONS_FOR_ONBOARDING;

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
  { code: "WHATSAPP", label: "Ticket por WhatsApp", description: "Envía el tiquete al WhatsApp del cliente" },
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

import { Step1Schema, getStep2Schema, getStep3Schema, Step4Schema, Step6Schema, formatZodErrors } from "./onboarding-schema";

export function validateStep(
  step: number,
  data: Record<string, unknown>,
  vehicleTypes: string[],
): { isValid: boolean; errors: StepValidationErrors } {
  let result;
  
  switch (step) {
    case 1:
      result = Step1Schema.safeParse(data);
      break;
    case 2:
      result = getStep2Schema(vehicleTypes).safeParse(data);
      break;
    case 3:
      result = getStep3Schema(vehicleTypes).safeParse(data);
      break;
    case 4:
      result = Step4Schema.safeParse(data);
      break;
    case 6:
      result = Step6Schema.safeParse(data);
      break;
    default:
      return { isValid: true, errors: {} };
  }

  if (result.success) {
    return { isValid: true, errors: {} };
  } else {
    return { isValid: false, errors: formatZodErrors(result.error) };
  }
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
