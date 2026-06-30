import { describe, it, expect } from "vitest";
import { getCurrencyCodeFromCountryCode, sortEnabledSteps, validateStep } from "./onboarding-logic";

describe("onboarding-logic", () => {
  it("orders Caja before Tarifas in the wizard flow", () => {
    expect(sortEnabledSteps([1, 2, 3, 4, 5, 6])).toEqual([1, 2, 4, 3, 5, 6]);
  });

  it("maps countries to the expected currency codes", () => {
    expect(getCurrencyCodeFromCountryCode("AR")).toBe("ARS");
    expect(getCurrencyCodeFromCountryCode("CO")).toBe("COP");
    expect(getCurrencyCodeFromCountryCode("ZZ")).toBe("COP");
  });

  it("returns step 3 field errors with specific paths", () => {
    const result = validateStep(
      3,
      {
        billingModel: "HOURLY",
        baseValue: "",
        hasNightRate: true,
        nightRate: "",
        nightStartTime: "20:00",
        nightEndTime: "20:00",
        enableRateByType: true,
        ratesByType: { CAR: "" },
      },
      ["CAR"],
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.baseValue).toBe("La tarifa base debe ser mayor a 0.");
    expect(result.errors.nightRate).toBe("La tarifa nocturna debe ser mayor a 0.");
    expect(result.errors.nightEndTime).toBe("La hora de inicio y fin no pueden ser iguales.");
    expect(result.errors["ratesByType.CAR"]).toBe("Ingresa una tarifa válida.");
  });

  it("humanizes missing required fields instead of exposing Zod defaults", () => {
    const result = validateStep(3, {}, ["CAR"]);

    expect(result.isValid).toBe(false);
    expect(result.errors.billingModel).toBe("Selecciona un modelo de cobro.");
    expect(Object.values(result.errors)).not.toContain("Required");
  });
});
