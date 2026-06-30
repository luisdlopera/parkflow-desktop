import { describe, expect, it } from "vitest";
import { createPricingConfiguration } from "../adapters";
import { calculatePricingPreview } from "../simulator";

describe("calculatePricingPreview", () => {
  it("calculates hourly pricing with grace minutes", () => {
    const config = createPricingConfiguration({
      rates: { pricePerHour: 5000 },
      rules: { graceMinutes: 15, minimumChargeMinutes: 0, rounding: { mode: "UP", incrementMinutes: 60 } },
    });

    const preview = calculatePricingPreview(config, 60);

    expect(preview.billableMinutes).toBe(60);
    expect(preview.total).toBe(5000);
  });

  it("calculates fractional pricing with dynamic units", () => {
    const config = createPricingConfiguration({
      strategy: { type: "FRACTIONAL", label: "Por fracción" },
      rates: { fractionMinutes: 15, fractionPrice: 1500 },
      rules: { graceMinutes: 0, minimumChargeMinutes: 0, rounding: { mode: "UP", incrementMinutes: 15 } },
    });

    const preview = calculatePricingPreview(config, 40);

    expect(preview.chargedUnits).toBe(3);
    expect(preview.total).toBe(4500);
  });

  it("applies daily caps", () => {
    const config = createPricingConfiguration({
      rates: { pricePerHour: 8000 },
      rules: {
        graceMinutes: 0,
        minimumChargeMinutes: 0,
        rounding: { mode: "UP", incrementMinutes: 60 },
        dailyCaps: { enabled: true, maxDailyPrice: 20000 },
      },
    });

    expect(calculatePricingPreview(config, 180).total).toBe(20000);
  });

  it("calculates mixed daily plus hourly pricing", () => {
    const config = createPricingConfiguration({
      strategy: { type: "MIXED", label: "Mixta" },
      rates: { pricePerHour: 5000, dailyPrice: 30000 },
      rules: { graceMinutes: 0, minimumChargeMinutes: 0, rounding: { mode: "UP", incrementMinutes: 60 } },
    });

    expect(calculatePricingPreview(config, 1500).total).toBe(35000);
  });

  it("uses vehicle overrides", () => {
    const config = createPricingConfiguration({
      rates: { pricePerHour: 5000 },
      rules: {
        graceMinutes: 0,
        minimumChargeMinutes: 0,
        rounding: { mode: "UP", incrementMinutes: 60 },
        vehicleOverrides: { MOTORCYCLE: { rates: { pricePerHour: 2500 } } },
      },
    });

    expect(calculatePricingPreview(config, 60, { vehicleType: "MOTORCYCLE" }).total).toBe(2500);
  });
});
