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
        if (handling !== "LOCKERS" && handling !== "NONE") {
          errors.helmetHandling = "Selecciona una opción de custodia de cascos.";
        }
        if (handling === "LOCKERS") {
          const count =
            typeof data.helmetTokenCount === "number"
              ? data.helmetTokenCount
              : Number(data.helmetTokenCount);
          if (!Number.isFinite(count) || count <= 0) {
            errors.helmetTokenCount = "La cantidad de lockers debe ser mayor a 0.";
          } else if (count > 9999) {
            errors.helmetTokenCount = "La cantidad de lockers no puede superar 9999.";
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
      const model = data.billingModel as string;
      if (!model) {
        errors.billingModel = "Selecciona un modelo de cobro.";
      } else {
        if (model === "HOURLY" || model === "MIXED") {
          const base = typeof data.baseValue === "number" ? data.baseValue : Number(data.baseValue);
          if (!Number.isFinite(base) || base <= 0) {
            errors.baseValue = "La tarifa por hora debe ser mayor a 0.";
          }
        }
        if (model === "FLAT" || model === "FULL_DAY") {
          const flatRate = typeof data.flatRate === "number" ? data.flatRate : Number(data.flatRate);
          if (!Number.isFinite(flatRate) || flatRate <= 0) {
            errors.flatRate = "La tarifa única/día completo debe ser mayor a 0.";
          }
        }
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
