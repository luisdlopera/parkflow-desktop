import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deepMergeSafe,
  backupOnboardingConfig,
  restoreOnboardingConfig,
  ONBOARDING_PROTECTED_KEYS,
} from "@/lib/config/config-merge";

describe("ONBOARDING_PROTECTED_KEYS", () => {
  it("contains expected keys", () => {
    expect(ONBOARDING_PROTECTED_KEYS).toContain("businessModel");
    expect(ONBOARDING_PROTECTED_KEYS).toContain("operationalProfile");
    expect(ONBOARDING_PROTECTED_KEYS).toContain("vehicleTypes");
    expect(ONBOARDING_PROTECTED_KEYS).toContain("paymentMethods");
  });
});

describe("deepMergeSafe", () => {
  it("merges two flat objects", () => {
    const result = deepMergeSafe({ a: 1, b: 2 }, { b: 3, c: 4 });
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("deep merges nested objects", () => {
    const result = deepMergeSafe(
      { config: { host: "localhost", port: 3000 } },
      { config: { port: 4000, ssl: true } },
    );
    expect(result).toEqual({ config: { host: "localhost", port: 4000, ssl: true } });
  });

  it("later values override earlier for same key", () => {
    const result = deepMergeSafe({ x: 1 }, { x: 2 });
    expect(result).toEqual({ x: 2 });
  });

  it("handles null values in override", () => {
    const result = deepMergeSafe({ a: 1, b: 2 }, { a: null, c: null });
    expect(result).toEqual({ a: null, b: 2, c: null });
  });

  it("ignores undefined values in override", () => {
    const result = deepMergeSafe({ a: 1 }, { a: undefined, b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("merges empty objects", () => {
    const result = deepMergeSafe({}, { a: 1 });
    expect(result).toEqual({ a: 1 });
  });

  it("returns empty object for empty base and override", () => {
    const result = deepMergeSafe({}, {});
    expect(result).toEqual({});
  });

  it("replaces arrays instead of deep merging", () => {
    const result = deepMergeSafe({ items: [1, 2] }, { items: [3, 4] });
    expect(result).toEqual({ items: [3, 4] });
  });

  it("sets null override value directly instead of deep merging", () => {
    const result = deepMergeSafe({ nested: { a: 1 } }, { nested: null });
    expect(result).toEqual({ nested: null });
  });
});

describe("backupOnboardingConfig", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("backups parkflow-onboarding-store to parkflow-onboarding-backup", () => {
    localStorage.setItem("parkflow-onboarding-store", JSON.stringify({ key: "value" }));
    backupOnboardingConfig();
    expect(localStorage.getItem("parkflow-onboarding-backup")).toBe(
      JSON.stringify({ key: "value" }),
    );
  });

  it("does nothing when no store exists", () => {
    backupOnboardingConfig();
    expect(localStorage.getItem("parkflow-onboarding-backup")).toBeNull();
  });
});

describe("restoreOnboardingConfig", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("restores backup when no current config exists", () => {
    localStorage.setItem("parkflow-onboarding-backup", JSON.stringify({ key: "value" }));
    restoreOnboardingConfig();
    expect(localStorage.getItem("parkflow-onboarding-store")).toBe(
      JSON.stringify({ key: "value" }),
    );
    expect(localStorage.getItem("parkflow-onboarding-backup")).toBeNull();
  });

  it("removes backup key after restore", () => {
    localStorage.setItem("parkflow-onboarding-backup", JSON.stringify({ a: 1 }));
    restoreOnboardingConfig();
    expect(localStorage.getItem("parkflow-onboarding-backup")).toBeNull();
  });

  it("does nothing when no backup exists", () => {
    localStorage.setItem("parkflow-onboarding-store", JSON.stringify({ current: true }));
    restoreOnboardingConfig();
    expect(localStorage.getItem("parkflow-onboarding-store")).toBe(
      JSON.stringify({ current: true }),
    );
  });
});
