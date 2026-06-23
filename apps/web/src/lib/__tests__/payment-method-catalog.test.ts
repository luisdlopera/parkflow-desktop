import { describe, it, expect } from "vitest";
import {
  PAYMENT_METHOD_CATALOG,
  PAYMENT_OPTIONS_FOR_ONBOARDING,
} from "@/lib/payment-method-catalog";

const ALL_CODES = [
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

describe("PAYMENT_METHOD_CATALOG", () => {
  it("has the correct number of entries", () => {
    expect(PAYMENT_METHOD_CATALOG).toHaveLength(ALL_CODES.length);
  });

  it("each entry has required properties", () => {
    for (const entry of PAYMENT_METHOD_CATALOG) {
      expect(entry).toHaveProperty("code");
      expect(entry).toHaveProperty("label");
      expect(entry).toHaveProperty("hint");
      expect(entry).toHaveProperty("tone");
      expect(entry).toHaveProperty("requiresReference");
      expect(entry).toHaveProperty("availableInOnboarding");
    }
  });

  it("covers all PaymentMethodCode values", () => {
    const catalogCodes = PAYMENT_METHOD_CATALOG.map((m) => m.code).sort();
    expect(catalogCodes).toEqual([...ALL_CODES].sort());
  });

  it("has non-empty labels and hints", () => {
    for (const entry of PAYMENT_METHOD_CATALOG) {
      expect(entry.label).toBeTruthy();
      expect(typeof entry.label).toBe("string");
      expect(entry.hint).toBeTruthy();
      expect(typeof entry.hint).toBe("string");
    }
  });

  it("has unique codes", () => {
    const codes = PAYMENT_METHOD_CATALOG.map((m) => m.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("CASH has requiresReference false", () => {
    const cash = PAYMENT_METHOD_CATALOG.find((m) => m.code === "CASH");
    expect(cash?.requiresReference).toBe(false);
  });

  it("NEQUI has requiresReference true", () => {
    const nequi = PAYMENT_METHOD_CATALOG.find((m) => m.code === "NEQUI");
    expect(nequi?.requiresReference).toBe(true);
  });
});

describe("PAYMENT_OPTIONS_FOR_ONBOARDING", () => {
  it("includes only availableInOnboarding entries", () => {
    for (const method of PAYMENT_OPTIONS_FOR_ONBOARDING) {
      expect(method.availableInOnboarding).toBe(true);
    }
  });

  it("excludes non-onboarding entries (INTERNAL_CREDIT, OTHER)", () => {
    const excludedCodes = PAYMENT_OPTIONS_FOR_ONBOARDING.map((m) => m.code);
    expect(excludedCodes).not.toContain("INTERNAL_CREDIT");
    expect(excludedCodes).not.toContain("OTHER");
  });
});
