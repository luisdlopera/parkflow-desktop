import { z } from "zod";
import type { PricingBuilderErrors } from "./types";

const money = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number().positive().optional(),
);

const minutes = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number().int().positive().optional(),
);

export const pricingConfigurationSchema = z
  .object({
    name: z.string().min(1, "Dale un nombre a esta tarifa"),
    currency: z.literal("COP"),
    active: z.boolean(),
    advancedMode: z.boolean(),
    vehicleType: z.string().nullable().optional(),
    site: z.string().nullable().optional(),
    siteId: z.string().nullable().optional(),
    strategy: z.object({
      type: z.enum(["HOURLY", "FRACTIONAL", "DAILY", "NIGHT", "MIXED"]),
      label: z.string(),
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
      graceMinutes: z.coerce.number().int().min(0, "Los minutos de cortesía no pueden ser negativos"),
      minimumChargeMinutes: z.coerce.number().int().min(0, "El mínimo de cobro no puede ser negativo"),
      rounding: z.object({
        mode: z.enum(["NONE", "UP", "DOWN", "NEAREST"]),
        incrementMinutes: z.coerce.number().int().positive().optional(),
      }),
      specialHours: z
        .object({
          enabled: z.boolean(),
          startTime: z.string(),
          endTime: z.string(),
        })
        .optional(),
      weekends: z
        .object({
          enabled: z.boolean(),
          surchargePercent: z.coerce.number().min(0).optional(),
          fixedPrice: money,
        })
        .optional(),
      dailyCaps: z
        .object({
          enabled: z.boolean(),
          maxDailyPrice: money,
        })
        .optional(),
      vehicleOverrides: z.record(z.any()).optional(),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.strategy.type === "HOURLY" && !data.rates.pricePerHour) {
      ctx.addIssue({ code: "custom", path: ["rates", "pricePerHour"], message: "Debes ingresar el valor por hora" });
    }

    if (data.strategy.type === "DAILY" && !data.rates.dailyPrice) {
      ctx.addIssue({ code: "custom", path: ["rates", "dailyPrice"], message: "Configura la tarifa diaria para continuar" });
    }

    if (data.strategy.type === "FRACTIONAL" && (!data.rates.fractionMinutes || !data.rates.fractionPrice)) {
      ctx.addIssue({ code: "custom", path: ["rates", "fractionPrice"], message: "Configura los minutos y el valor de la fracción" });
    }

    if (data.strategy.type === "NIGHT" && !data.rates.nightPrice) {
      ctx.addIssue({ code: "custom", path: ["rates", "nightPrice"], message: "Ingresa el valor de la tarifa nocturna" });
    }

    if (data.strategy.type === "MIXED" && !data.rates.pricePerHour && !data.rates.dailyPrice) {
      ctx.addIssue({ code: "custom", path: ["rates"], message: "Agrega al menos una tarifa por hora o diaria" });
    }

    if (data.rules.rounding.mode !== "NONE" && !data.rules.rounding.incrementMinutes) {
      ctx.addIssue({ code: "custom", path: ["rules", "rounding", "incrementMinutes"], message: "Elige cada cuántos minutos se redondea" });
    }

    if (data.advancedMode && data.rules.dailyCaps?.enabled && !data.rules.dailyCaps.maxDailyPrice) {
      ctx.addIssue({ code: "custom", path: ["rules", "dailyCaps", "maxDailyPrice"], message: "Ingresa el tope diario" });
    }
  });

export function validatePricingConfiguration(value: unknown): PricingBuilderErrors {
  const result = pricingConfigurationSchema.safeParse(value);
  if (result.success) return {};

  return result.error.issues.reduce<PricingBuilderErrors>((acc, issue) => {
    acc[issue.path.join(".") || "form"] = issue.message;
    return acc;
  }, {});
}
