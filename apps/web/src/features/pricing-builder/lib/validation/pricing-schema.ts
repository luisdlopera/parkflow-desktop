import { z } from "zod";
import { PRICING_RULE_EXECUTION_ORDER } from "../constants";
import { labelVehicle } from "../display";
import type { PricingBuilderErrors } from "../types";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const requiredText = "Completa este campo para continuar";
const invalidText = "Revisa este campo para continuar";

const stringField = () => z.string({ required_error: requiredText, invalid_type_error: invalidText });
const booleanField = () => z.boolean({ required_error: requiredText, invalid_type_error: "Elige sí o no para continuar" });

const money = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number({ invalid_type_error: "Ingresa un valor numérico válido" }).positive("Ingresa un valor mayor a 0").optional(),
);

const minutes = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z
    .number({ invalid_type_error: "Ingresa minutos válidos" })
    .int("Ingresa minutos enteros")
    .positive("Ingresa un número mayor a 0")
    .optional(),
);

const requiredMinutes = (minMessage: string) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? 0 : Number(value)),
    z.number({ invalid_type_error: "Ingresa minutos válidos" }).int("Ingresa minutos enteros").min(0, minMessage),
  );

export const pricingConfigurationSchema = z
  .object({
    name: stringField().min(1, "Dale un nombre a esta tarifa"),
    currency: z.literal("COP", { errorMap: () => ({ message: "La moneda debe ser COP" }) }),
    active: booleanField(),
    advancedMode: booleanField(),
    vehicleType: stringField().nullable().optional(),
    site: stringField().nullable().optional(),
    siteId: stringField().nullable().optional(),
    strategy: z.object({
      type: z.enum(["HOURLY", "FRACTIONAL", "DAILY", "NIGHT", "MIXED"], {
        required_error: "Selecciona una estrategia de cobro",
        invalid_type_error: "Selecciona una estrategia de cobro válida",
      }),
      label: stringField(),
    }),
    rates: z.object({
      pricePerHour: money,
      dailyPrice: money,
      fractionMinutes: minutes,
      fractionPrice: money,
      nightPrice: money,
      mixed: z
        .object({
          pricePerHour: money,
          dailyPrice: money,
          nightPrice: money,
        })
        .optional(),
    }),
    rules: z.object({
      executionOrder: z
        .array(z.enum(["GRACE_PERIOD", "MINIMUM_CHARGE", "ROUNDING", "STRATEGY_PRICE", "DAILY_CAP"]), {
          invalid_type_error: "El orden de cálculo debe ser una lista válida",
        })
        .optional(),
      graceMinutes: requiredMinutes("Los minutos de cortesía no pueden ser negativos"),
      minimumChargeMinutes: requiredMinutes("El mínimo de cobro no puede ser negativo"),
      rounding: z.object({
        mode: z.enum(["NONE", "UP", "DOWN", "NEAREST"], {
          required_error: "Selecciona cómo redondear el tiempo",
          invalid_type_error: "Selecciona una opción de redondeo válida",
        }),
        incrementMinutes: minutes,
      }),
      specialHours: z
        .object({
          enabled: booleanField(),
          startTime: stringField(),
          endTime: stringField(),
        })
        .optional(),
      weekends: z
        .object({
          enabled: booleanField(),
          surchargePercent: z.preprocess(
            (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
            z.number({ invalid_type_error: "Ingresa un porcentaje válido" }).min(0, "El porcentaje no puede ser negativo").optional(),
          ),
          fixedPrice: money,
        })
        .optional(),
      dailyCaps: z
        .object({
          enabled: booleanField(),
          maxDailyPrice: money,
        })
        .optional(),
      vehicleOverrides: z.record(z.any()).optional(),
    }),
  })
  .superRefine((data, ctx) => {
    validateStrategy(data, ctx);
    validateRules(data, ctx);
    validateOverrides(data, ctx);
  });

export function validatePricingConfiguration(value: unknown): PricingBuilderErrors {
  const result = pricingConfigurationSchema.safeParse(value);
  if (result.success) return {};

  return result.error.issues.reduce<PricingBuilderErrors>((acc, issue) => {
    acc[issue.path.join(".") || "form"] = issue.message;
    return acc;
  }, {});
}

function validateStrategy(data: z.infer<typeof pricingConfigurationSchema>, ctx: z.RefinementCtx) {
  if (data.strategy.type === "HOURLY" && !data.rates.pricePerHour) {
    ctx.addIssue({ code: "custom", path: ["rates", "pricePerHour"], message: "Debes ingresar el valor por hora" });
  }
  if (data.strategy.type === "DAILY" && !data.rates.dailyPrice) {
    ctx.addIssue({ code: "custom", path: ["rates", "dailyPrice"], message: "Configura la tarifa diaria para continuar" });
  }
  if (data.strategy.type === "FRACTIONAL" && (!data.rates.fractionMinutes || !data.rates.fractionPrice)) {
    ctx.addIssue({ code: "custom", path: ["rates", "fractionPrice"], message: "Configura los minutos y el valor de la fracción" });
  }
  if (data.strategy.type === "NIGHT") {
    if (!data.rates.nightPrice) {
      ctx.addIssue({ code: "custom", path: ["rates", "nightPrice"], message: "Ingresa el valor de la tarifa nocturna" });
    }
    if (!data.rules.specialHours?.enabled) {
      ctx.addIssue({ code: "custom", path: ["rules", "specialHours"], message: "Activa el horario especial para una tarifa nocturna" });
    }
  }
  if (data.strategy.type === "MIXED" && (!data.rates.pricePerHour || (!data.rates.dailyPrice && !data.rates.nightPrice))) {
    ctx.addIssue({ code: "custom", path: ["rates"], message: "Configura valor por hora y al menos tarifa diaria o nocturna" });
  }
}

function validateRules(data: z.infer<typeof pricingConfigurationSchema>, ctx: z.RefinementCtx) {
  const order = data.rules.executionOrder ?? PRICING_RULE_EXECUTION_ORDER;
  if (order.join("|") !== PRICING_RULE_EXECUTION_ORDER.join("|")) {
    ctx.addIssue({ code: "custom", path: ["rules", "executionOrder"], message: "El orden de cálculo no debe modificarse" });
  }
  if (data.rules.minimumChargeMinutes > 0 && data.rules.graceMinutes > data.rules.minimumChargeMinutes) {
    ctx.addIssue({ code: "custom", path: ["rules", "graceMinutes"], message: "La cortesía no puede ser mayor que el mínimo de cobro" });
  }
  if (data.rules.rounding.mode !== "NONE" && !data.rules.rounding.incrementMinutes) {
    ctx.addIssue({ code: "custom", path: ["rules", "rounding", "incrementMinutes"], message: "Elige cada cuántos minutos se redondea" });
  }
  const specialHours = data.rules.specialHours;
  if (specialHours?.enabled) {
    if (!timePattern.test(specialHours.startTime) || !timePattern.test(specialHours.endTime)) {
      ctx.addIssue({ code: "custom", path: ["rules", "specialHours"], message: "Usa horas válidas en formato de 24 horas, por ejemplo 20:00" });
    } else if (specialHours.startTime === specialHours.endTime) {
      ctx.addIssue({ code: "custom", path: ["rules", "specialHours", "endTime"], message: "La hora de inicio y fin no pueden ser iguales" });
    }
  }
  const cap = data.rules.dailyCaps;
  if (data.advancedMode && cap?.enabled) {
    if (!cap.maxDailyPrice) {
      ctx.addIssue({ code: "custom", path: ["rules", "dailyCaps", "maxDailyPrice"], message: "Ingresa el tope diario" });
    } else if (data.rates.pricePerHour && cap.maxDailyPrice < data.rates.pricePerHour) {
      ctx.addIssue({ code: "custom", path: ["rules", "dailyCaps", "maxDailyPrice"], message: "El tope diario no puede ser menor que una hora de cobro" });
    }
  }
}

function validateOverrides(data: z.infer<typeof pricingConfigurationSchema>, ctx: z.RefinementCtx) {
  Object.entries(data.rules.vehicleOverrides ?? {}).forEach(([vehicleType, override]) => {
    if (!vehicleType.trim()) {
      ctx.addIssue({ code: "custom", path: ["rules", "vehicleOverrides"], message: "El tipo de vehículo del ajuste no es válido" });
    }
    if (!override || typeof override !== "object") return;
    const strategyType = override.strategy?.type ?? data.strategy.type;
    const rates = { ...data.rates, ...(override.rates ?? {}) };
    if (strategyType === "HOURLY" && !rates.pricePerHour) {
      ctx.addIssue({ code: "custom", path: ["rules", "vehicleOverrides", vehicleType], message: `Configura el valor por hora para ${labelVehicle(vehicleType)}` });
    }
    if (strategyType === "FRACTIONAL" && (!rates.fractionMinutes || !rates.fractionPrice)) {
      ctx.addIssue({ code: "custom", path: ["rules", "vehicleOverrides", vehicleType], message: `Configura fracción y valor para ${labelVehicle(vehicleType)}` });
    }
    if (strategyType === "DAILY" && !rates.dailyPrice) {
      ctx.addIssue({ code: "custom", path: ["rules", "vehicleOverrides", vehicleType], message: `Configura tarifa diaria para ${labelVehicle(vehicleType)}` });
    }
  });
}
