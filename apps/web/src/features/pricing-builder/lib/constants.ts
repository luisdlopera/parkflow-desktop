import type { PricingStrategyType } from "./types";

export const STRATEGY_LABELS: Record<PricingStrategyType, string> = {
  HOURLY: "Por hora",
  FRACTIONAL: "Por fracción",
  DAILY: "Diaria",
  NIGHT: "Nocturna",
  MIXED: "Mixta",
};

export const STRATEGY_COPY: Record<PricingStrategyType, { description: string; impact: string }> = {
  HOURLY: {
    description: "Cobra un valor por cada hora o bloque de tiempo.",
    impact: "Ideal para parqueaderos con rotación constante.",
  },
  FRACTIONAL: {
    description: "Cobra por bloques pequeños, como 15 o 30 minutos.",
    impact: "Útil cuando tus clientes hacen estancias cortas.",
  },
  DAILY: {
    description: "Cobra un precio fijo por día o permanencia larga.",
    impact: "Bueno para operación de día completo.",
  },
  NIGHT: {
    description: "Cobra un valor especial en horario nocturno.",
    impact: "Pensado para operación 24 horas o recargos de noche.",
  },
  MIXED: {
    description: "Combina hora, día y noche en una sola tarifa.",
    impact: "Para reglas comerciales más completas.",
  },
};

export const strategyFieldMap: Record<
  PricingStrategyType,
  Array<"pricePerHour" | "fractionMinutes" | "fractionPrice" | "dailyPrice" | "nightPrice">
> = {
  HOURLY: ["pricePerHour"],
  FRACTIONAL: ["fractionMinutes", "fractionPrice"],
  DAILY: ["dailyPrice"],
  NIGHT: ["nightPrice"],
  MIXED: ["pricePerHour", "dailyPrice", "nightPrice"],
};

export const DEFAULT_PRICING_CONFIGURATION = {
  name: "Tarifa estándar",
  site: "DEFAULT",
  siteId: null,
  vehicleType: null,
  strategy: { type: "HOURLY", label: STRATEGY_LABELS.HOURLY },
  rules: {
    graceMinutes: 0,
    minimumChargeMinutes: 0,
    rounding: { mode: "UP", incrementMinutes: 60 },
    specialHours: { enabled: false, startTime: "20:00", endTime: "06:00" },
    weekends: { enabled: false },
    dailyCaps: { enabled: false },
    vehicleOverrides: {},
  },
  rates: {
    pricePerHour: undefined,
    fractionMinutes: 15,
    fractionPrice: undefined,
    dailyPrice: undefined,
    nightPrice: undefined,
  },
  advancedMode: false,
  active: true,
  currency: "COP",
} as const;
