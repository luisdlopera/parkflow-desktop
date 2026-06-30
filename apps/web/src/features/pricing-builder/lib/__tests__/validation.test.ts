import { describe, expect, it } from "vitest";
import { createPricingConfiguration } from "../adapters";
import { validatePricingConfiguration } from "../validation";

describe("validatePricingConfiguration", () => {
  it("requires hourly price only for hourly strategy", () => {
    const errors = validatePricingConfiguration(createPricingConfiguration({ rates: { pricePerHour: undefined } }));

    expect(errors["rates.pricePerHour"]).toBe("Debes ingresar el valor por hora");
  });

  it("requires daily price for daily strategy", () => {
    const errors = validatePricingConfiguration(createPricingConfiguration({
      strategy: { type: "DAILY", label: "Diaria" },
      rates: {},
    }));

    expect(errors["rates.dailyPrice"]).toBe("Configura la tarifa diaria para continuar");
  });

  it("does not require hidden daily fields for hourly strategy", () => {
    const errors = validatePricingConfiguration(createPricingConfiguration({ rates: { pricePerHour: 5000 } }));

    expect(errors["rates.dailyPrice"]).toBeUndefined();
  });

  it("validates advanced daily cap only when enabled", () => {
    const errors = validatePricingConfiguration(createPricingConfiguration({
      advancedMode: true,
      rates: { pricePerHour: 5000 },
      rules: {
        graceMinutes: 0,
        minimumChargeMinutes: 0,
        rounding: { mode: "UP", incrementMinutes: 60 },
        dailyCaps: { enabled: true },
      },
    }));

    expect(errors["rules.dailyCaps.maxDailyPrice"]).toBe("Ingresa el tope diario");
  });
});
