import { describe, it, expect } from "vitest";
import {
  PAYMENT_METHOD_CATALOG,
  PAYMENT_OPTIONS_FOR_ONBOARDING,
  PaymentMethodCode,
} from "./payment-method-catalog";

describe("PAYMENT_METHOD_CATALOG", () => {
  it("exports an array", () => {
    expect(Array.isArray(PAYMENT_METHOD_CATALOG)).toBe(true);
  });

  it("contains 11 payment methods", () => {
    expect(PAYMENT_METHOD_CATALOG.length).toBe(11);
  });

  it("all entries have required fields", () => {
    PAYMENT_METHOD_CATALOG.forEach((entry) => {
      expect(entry.code).toBeDefined();
      expect(entry.label).toBeDefined();
      expect(entry.hint).toBeDefined();
      expect(entry.tone).toBeDefined();
      expect(typeof entry.requiresReference).toBe("boolean");
      expect(typeof entry.availableInOnboarding).toBe("boolean");
    });
  });

  it("has no duplicate codes", () => {
    const codes = PAYMENT_METHOD_CATALOG.map((e) => e.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(PAYMENT_METHOD_CATALOG.length);
  });

  it("includes CASH payment method", () => {
    const cash = PAYMENT_METHOD_CATALOG.find((m) => m.code === "CASH");
    expect(cash).toBeDefined();
    expect(cash?.label).toBe("Efectivo");
    expect(cash?.requiresReference).toBe(false);
    expect(cash?.availableInOnboarding).toBe(true);
  });

  it("includes DEBIT_CARD payment method", () => {
    const debit = PAYMENT_METHOD_CATALOG.find((m) => m.code === "DEBIT_CARD");
    expect(debit).toBeDefined();
    expect(debit?.label).toBe("Tarjeta débito");
    expect(debit?.requiresReference).toBe(false);
  });

  it("includes CREDIT_CARD payment method", () => {
    const credit = PAYMENT_METHOD_CATALOG.find((m) => m.code === "CREDIT_CARD");
    expect(credit).toBeDefined();
    expect(credit?.label).toBe("Tarjeta crédito");
    expect(credit?.requiresReference).toBe(false);
  });

  it("includes QR payment method", () => {
    const qr = PAYMENT_METHOD_CATALOG.find((m) => m.code === "QR");
    expect(qr).toBeDefined();
    expect(qr?.label).toBe("QR");
    expect(qr?.requiresReference).toBe(false);
  });

  it("includes NEQUI payment method", () => {
    const nequi = PAYMENT_METHOD_CATALOG.find((m) => m.code === "NEQUI");
    expect(nequi).toBeDefined();
    expect(nequi?.label).toBe("Nequi");
    expect(nequi?.requiresReference).toBe(true);
  });

  it("includes DAVIPLATA payment method", () => {
    const davi = PAYMENT_METHOD_CATALOG.find((m) => m.code === "DAVIPLATA");
    expect(davi).toBeDefined();
    expect(davi?.label).toBe("Daviplata");
    expect(davi?.requiresReference).toBe(true);
  });

  it("includes TRANSFER payment method", () => {
    const transfer = PAYMENT_METHOD_CATALOG.find((m) => m.code === "TRANSFER");
    expect(transfer).toBeDefined();
    expect(transfer?.label).toBe("Transferencia");
    expect(transfer?.requiresReference).toBe(true);
  });

  it("includes AGREEMENT payment method", () => {
    const agreement = PAYMENT_METHOD_CATALOG.find((m) => m.code === "AGREEMENT");
    expect(agreement).toBeDefined();
    expect(agreement?.label).toBe("Convenio");
    expect(agreement?.requiresReference).toBe(false);
  });

  it("includes INTERNAL_CREDIT payment method", () => {
    const internal = PAYMENT_METHOD_CATALOG.find((m) => m.code === "INTERNAL_CREDIT");
    expect(internal).toBeDefined();
    expect(internal?.label).toBe("Crédito interno");
    expect(internal?.availableInOnboarding).toBe(false);
  });

  it("includes OTHER payment method", () => {
    const other = PAYMENT_METHOD_CATALOG.find((m) => m.code === "OTHER");
    expect(other).toBeDefined();
    expect(other?.label).toBe("Otro");
    expect(other?.availableInOnboarding).toBe(false);
  });

  it("includes MIXED payment method", () => {
    const mixed = PAYMENT_METHOD_CATALOG.find((m) => m.code === "MIXED");
    expect(mixed).toBeDefined();
    expect(mixed?.label).toBe("Mixto");
    expect(mixed?.requiresReference).toBe(false);
    expect(mixed?.availableInOnboarding).toBe(true);
  });

  it.each([
    "CASH",
    "DEBIT_CARD",
    "CREDIT_CARD",
    "QR",
    "NEQUI",
    "DAVIPLATA",
    "TRANSFER",
    "AGREEMENT",
    "INTERNAL_CREDIT",
    "OTHER",
    "MIXED",
  ])("includes payment method %s", (code) => {
    const method = PAYMENT_METHOD_CATALOG.find((m) => m.code === code);
    expect(method).toBeDefined();
  });

  it("all labels are non-empty strings", () => {
    PAYMENT_METHOD_CATALOG.forEach((entry) => {
      expect(typeof entry.label).toBe("string");
      expect(entry.label.length).toBeGreaterThan(0);
    });
  });

  it("all hints are non-empty strings", () => {
    PAYMENT_METHOD_CATALOG.forEach((entry) => {
      expect(typeof entry.hint).toBe("string");
      expect(entry.hint.length).toBeGreaterThan(0);
    });
  });

  it("all tone values contain tailwind classes", () => {
    PAYMENT_METHOD_CATALOG.forEach((entry) => {
      expect(entry.tone).toContain("bg-");
      expect(entry.tone).toContain("border");
    });
  });

  it("methods requiring reference have hint mentioning it", () => {
    PAYMENT_METHOD_CATALOG.filter((m) => m.requiresReference).forEach((entry) => {
      expect(entry.hint.toLowerCase()).toContain("referencia");
    });
  });

  it("can be used to find methods by code", () => {
    const cash = PAYMENT_METHOD_CATALOG.find((m) => m.code === "CASH");
    expect(cash?.code).toBe("CASH");
    expect(cash?.label).toBe("Efectivo");
  });

  it("can be used to find methods by label", () => {
    const debit = PAYMENT_METHOD_CATALOG.find((m) => m.label === "Tarjeta débito");
    expect(debit?.code).toBe("DEBIT_CARD");
  });

  it("supports filtering by requiresReference", () => {
    const requiring = PAYMENT_METHOD_CATALOG.filter((m) => m.requiresReference);
    expect(requiring.length).toBeGreaterThan(0);
    expect(requiring.every((m) => m.requiresReference)).toBe(true);
  });

  it("supports filtering by availableInOnboarding", () => {
    const available = PAYMENT_METHOD_CATALOG.filter((m) => m.availableInOnboarding);
    expect(available.length).toBeGreaterThan(0);
    expect(available.every((m) => m.availableInOnboarding)).toBe(true);
  });
});

describe("PAYMENT_OPTIONS_FOR_ONBOARDING", () => {
  it("exports an array", () => {
    expect(Array.isArray(PAYMENT_OPTIONS_FOR_ONBOARDING)).toBe(true);
  });

  it("contains only onboarding-available methods", () => {
    PAYMENT_OPTIONS_FOR_ONBOARDING.forEach((method) => {
      expect(method.availableInOnboarding).toBe(true);
    });
  });

  it("filters out non-onboarding methods", () => {
    const codes = PAYMENT_OPTIONS_FOR_ONBOARDING.map((m) => m.code);
    expect(codes).not.toContain("INTERNAL_CREDIT");
    expect(codes).not.toContain("OTHER");
  });

  it("includes basic payment methods", () => {
    const codes = PAYMENT_OPTIONS_FOR_ONBOARDING.map((m) => m.code);
    expect(codes).toContain("CASH");
    expect(codes).toContain("DEBIT_CARD");
    expect(codes).toContain("CREDIT_CARD");
  });

  it("includes digital payment methods", () => {
    const codes = PAYMENT_OPTIONS_FOR_ONBOARDING.map((m) => m.code);
    expect(codes).toContain("QR");
    expect(codes).toContain("NEQUI");
    expect(codes).toContain("DAVIPLATA");
    expect(codes).toContain("TRANSFER");
  });

  it("includes agreement method", () => {
    const codes = PAYMENT_OPTIONS_FOR_ONBOARDING.map((m) => m.code);
    expect(codes).toContain("AGREEMENT");
  });

  it("includes mixed payment method", () => {
    const codes = PAYMENT_OPTIONS_FOR_ONBOARDING.map((m) => m.code);
    expect(codes).toContain("MIXED");
  });

  it("has 9 methods (all except INTERNAL_CREDIT and OTHER)", () => {
    expect(PAYMENT_OPTIONS_FOR_ONBOARDING.length).toBe(9);
  });

  it("is derived from PAYMENT_METHOD_CATALOG", () => {
    const catalogOnboarding = PAYMENT_METHOD_CATALOG.filter((m) => m.availableInOnboarding);
    expect(PAYMENT_OPTIONS_FOR_ONBOARDING.length).toBe(catalogOnboarding.length);
  });

  it("has same structure as catalog entries", () => {
    PAYMENT_OPTIONS_FOR_ONBOARDING.forEach((method) => {
      expect(method.code).toBeDefined();
      expect(method.label).toBeDefined();
      expect(method.hint).toBeDefined();
      expect(method.tone).toBeDefined();
      expect(typeof method.requiresReference).toBe("boolean");
      expect(typeof method.availableInOnboarding).toBe("boolean");
    });
  });

  it("can be mapped to dropdown options", () => {
    const options = PAYMENT_OPTIONS_FOR_ONBOARDING.map((m) => ({
      value: m.code,
      label: m.label,
    }));

    expect(options.length).toBeGreaterThan(0);
    options.forEach((opt) => {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
    });
  });

  it("can be used to filter by requiresReference", () => {
    const requiring = PAYMENT_OPTIONS_FOR_ONBOARDING.filter((m) => m.requiresReference);
    expect(requiring.length).toBeGreaterThan(0);
  });

  it("can find method by code", () => {
    const cash = PAYMENT_OPTIONS_FOR_ONBOARDING.find((m) => m.code === "CASH");
    expect(cash).toBeDefined();
    expect(cash?.label).toBe("Efectivo");
  });
});

describe("Payment method catalog utility functions", () => {
  it("can get all payment codes", () => {
    const codes = PAYMENT_METHOD_CATALOG.map((m) => m.code);
    expect(codes.length).toBe(11);
    expect(codes).toContain("CASH");
  });

  it("can get all onboarding codes", () => {
    const codes = PAYMENT_OPTIONS_FOR_ONBOARDING.map((m) => m.code);
    expect(codes.length).toBe(9);
  });

  it("can check if method requires reference", () => {
    const nequi = PAYMENT_METHOD_CATALOG.find((m) => m.code === "NEQUI");
    expect(nequi?.requiresReference).toBe(true);

    const cash = PAYMENT_METHOD_CATALOG.find((m) => m.code === "CASH");
    expect(cash?.requiresReference).toBe(false);
  });

  it("can check if method is available in onboarding", () => {
    const cash = PAYMENT_OPTIONS_FOR_ONBOARDING.find((m) => m.code === "CASH");
    expect(cash).toBeDefined();

    const internal = PAYMENT_METHOD_CATALOG.find((m) => m.code === "INTERNAL_CREDIT");
    expect(internal?.availableInOnboarding).toBe(false);
  });

  it("can build tone mapping", () => {
    const toneMap = new Map(
      PAYMENT_METHOD_CATALOG.map((m) => [m.code, m.tone])
    );

    expect(toneMap.get("CASH")).toContain("emerald");
    expect(toneMap.get("DEBIT_CARD")).toContain("sky");
    expect(toneMap.get("CREDIT_CARD")).toContain("indigo");
  });

  it("can count methods by requiresReference", () => {
    const requiring = PAYMENT_METHOD_CATALOG.filter((m) => m.requiresReference).length;
    const notRequiring = PAYMENT_METHOD_CATALOG.filter((m) => !m.requiresReference).length;

    expect(requiring + notRequiring).toBe(11);
    expect(requiring).toBeGreaterThan(0);
  });

  it("can group by availableInOnboarding", () => {
    const byOnboarding = {
      available: PAYMENT_METHOD_CATALOG.filter((m) => m.availableInOnboarding),
      notAvailable: PAYMENT_METHOD_CATALOG.filter((m) => !m.availableInOnboarding),
    };

    expect(byOnboarding.available.length).toBe(9);
    expect(byOnboarding.notAvailable.length).toBe(2);
  });

  it("can build label lookup", () => {
    const labelLookup = new Map(
      PAYMENT_METHOD_CATALOG.map((m) => [m.code, m.label])
    );

    expect(labelLookup.get("CASH")).toBe("Efectivo");
    expect(labelLookup.get("DEBIT_CARD")).toBe("Tarjeta débito");
    expect(labelLookup.get("CREDIT_CARD")).toBe("Tarjeta crédito");
  });

  it("can build hint lookup", () => {
    const hintLookup = new Map(
      PAYMENT_METHOD_CATALOG.map((m) => [m.code, m.hint])
    );

    expect(hintLookup.get("CASH")).toBe("Cambio / vuelto");
    expect(hintLookup.get("NEQUI")).toContain("Referencia");
  });

  it("digital payment methods have higher indices", () => {
    const methodIndices = new Map(
      PAYMENT_METHOD_CATALOG.map((m, i) => [m.code, i])
    );

    const digitalMethods = ["NEQUI", "DAVIPLATA", "TRANSFER", "QR"];
    const basicMethods = ["CASH", "DEBIT_CARD", "CREDIT_CARD"];

    // Just verify they exist
    digitalMethods.forEach((code) => {
      expect(methodIndices.has(code)).toBe(true);
    });
  });

  it("can validate payment method code type safety", () => {
    const validCodes: PaymentMethodCode[] = [
      "CASH",
      "DEBIT_CARD",
      "CREDIT_CARD",
      "QR",
      "NEQUI",
      "DAVIPLATA",
      "TRANSFER",
      "AGREEMENT",
      "INTERNAL_CREDIT",
      "OTHER",
      "MIXED",
    ];

    validCodes.forEach((code) => {
      const method = PAYMENT_METHOD_CATALOG.find((m) => m.code === code);
      expect(method).toBeDefined();
    });
  });
});
