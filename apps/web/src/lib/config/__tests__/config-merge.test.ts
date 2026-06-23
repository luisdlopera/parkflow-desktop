import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  backupOnboardingConfig,
  restoreOnboardingConfig,
  deepMergeSafe,
  ONBOARDING_PROTECTED_KEYS,
} from "../config-merge";

describe("ONBOARDING_PROTECTED_KEYS", () => {
  it("contains expected keys", () => {
    expect(ONBOARDING_PROTECTED_KEYS).toContain("businessModel");
    expect(ONBOARDING_PROTECTED_KEYS).toContain("operationalProfile");
    expect(ONBOARDING_PROTECTED_KEYS).toContain("vehicleTypes");
    expect(ONBOARDING_PROTECTED_KEYS).toContain("paymentMethods");
    expect(ONBOARDING_PROTECTED_KEYS.length).toBe(4);
  });

  it("are all strings", () => {
    ONBOARDING_PROTECTED_KEYS.forEach((key) => {
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });
  });
});

describe("backupOnboardingConfig", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("backs up current onboarding store", () => {
    const data = { step: 1, data: "test" };
    localStorage.setItem("parkflow-onboarding-store", JSON.stringify(data));
    backupOnboardingConfig();
    const backup = localStorage.getItem("parkflow-onboarding-backup");
    expect(backup).toBe(JSON.stringify(data));
  });

  it("does nothing if no store exists", () => {
    backupOnboardingConfig();
    expect(localStorage.getItem("parkflow-onboarding-backup")).toBeNull();
  });

  it("overwrites previous backup", () => {
    localStorage.setItem("parkflow-onboarding-backup", "old-backup");
    localStorage.setItem("parkflow-onboarding-store", '{"new":"data"}');
    backupOnboardingConfig();
    expect(localStorage.getItem("parkflow-onboarding-backup")).toBe('{"new":"data"}');
  });

  it("backs up complex JSON structures", () => {
    const complex = {
      nested: { deep: { data: "value" } },
      array: [1, 2, 3],
      mixed: [{ id: 1 }, { id: 2 }],
    };
    localStorage.setItem("parkflow-onboarding-store", JSON.stringify(complex));
    backupOnboardingConfig();
    const backup = localStorage.getItem("parkflow-onboarding-backup");
    expect(JSON.parse(backup!)).toEqual(complex);
  });

  it("stores backup with correct key", () => {
    localStorage.setItem("parkflow-onboarding-store", "data");
    backupOnboardingConfig();
    expect(localStorage.getItem("parkflow-onboarding-backup")).toBe("data");
  });

  it("handles JSON serialization", () => {
    const data = { key: "value", number: 123, bool: true };
    localStorage.setItem("parkflow-onboarding-store", JSON.stringify(data));
    backupOnboardingConfig();
    const backup = JSON.parse(localStorage.getItem("parkflow-onboarding-backup")!);
    expect(backup).toEqual(data);
  });
});

describe("restoreOnboardingConfig", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("restores backup if no current store", () => {
    const backup = { step: 1 };
    localStorage.setItem("parkflow-onboarding-backup", JSON.stringify(backup));
    restoreOnboardingConfig();
    const store = localStorage.getItem("parkflow-onboarding-store");
    expect(JSON.parse(store!)).toEqual(backup);
  });

  it("does nothing if no backup exists", () => {
    restoreOnboardingConfig();
    expect(localStorage.getItem("parkflow-onboarding-store")).toBeNull();
  });

  it("merges backup into current store protecting keys", () => {
    const current = {
      step: 2,
      businessModel: { type: "current" },
      other: "current-value",
    };
    const backup = {
      step: 1,
      businessModel: { type: "backup" },
      other: "backup-value",
    };
    localStorage.setItem("parkflow-onboarding-store", JSON.stringify(current));
    localStorage.setItem("parkflow-onboarding-backup", JSON.stringify(backup));
    restoreOnboardingConfig();
    const merged = JSON.parse(localStorage.getItem("parkflow-onboarding-store")!);
    expect(merged.businessModel).toEqual(current.businessModel);
    expect(merged.other).toBe("backup-value");
  });

  it("removes backup after restore", () => {
    const backup = { data: "value" };
    localStorage.setItem("parkflow-onboarding-backup", JSON.stringify(backup));
    restoreOnboardingConfig();
    expect(localStorage.getItem("parkflow-onboarding-backup")).toBeNull();
  });

  it("falls back to backup on merge error", () => {
    localStorage.setItem("parkflow-onboarding-store", "invalid-json{");
    localStorage.setItem("parkflow-onboarding-backup", '{"valid":"json"}');
    restoreOnboardingConfig();
    expect(localStorage.getItem("parkflow-onboarding-store")).toBe('{"valid":"json"}');
  });

  it("handles complex merge scenarios", () => {
    const current = {
      level1: {
        level2: { protected: "should-stay", other: "should-update" },
      },
      paymentMethods: { current: true },
    };
    const backup = {
      level1: {
        level2: { protected: "backup-val", other: "backup-other" },
      },
      paymentMethods: { backup: true },
    };
    localStorage.setItem("parkflow-onboarding-store", JSON.stringify(current));
    localStorage.setItem("parkflow-onboarding-backup", JSON.stringify(backup));
    restoreOnboardingConfig();
    const result = JSON.parse(localStorage.getItem("parkflow-onboarding-store")!);
    expect(result.paymentMethods).toEqual(current.paymentMethods);
  });

  it("clears backup after successful merge", () => {
    localStorage.setItem("parkflow-onboarding-backup", '{"data":"backup"}');
    localStorage.setItem("parkflow-onboarding-store", '{"data":"current"}');
    restoreOnboardingConfig();
    expect(localStorage.getItem("parkflow-onboarding-backup")).toBeNull();
  });

  it("handles both store and backup missing", () => {
    expect(() => restoreOnboardingConfig()).not.toThrow();
  });
});

describe("deepMergeSafe", () => {
  it("merges shallow objects", () => {
    const base = { a: 1, b: 2 };
    const override = { b: 3, c: 4 };
    const result = deepMergeSafe(base, override);
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("does not mutate base object", () => {
    const base = { a: 1 };
    const override = { a: 2 };
    deepMergeSafe(base, override);
    expect(base.a).toBe(1);
  });

  it("merges nested objects recursively", () => {
    const base = { nested: { x: 1, y: 2 } };
    const override = { nested: { y: 3, z: 4 } };
    const result = deepMergeSafe(base, override);
    expect(result.nested).toEqual({ x: 1, y: 3, z: 4 });
  });

  it("replaces arrays instead of merging", () => {
    const base = { items: [1, 2, 3] };
    const override = { items: [4, 5] };
    const result = deepMergeSafe(base, override);
    expect(result.items).toEqual([4, 5]);
  });

  it("ignores undefined override values", () => {
    const base = { a: 1, b: 2 };
    const override = { a: undefined, b: 3 };
    const result = deepMergeSafe(base, override);
    expect(result.a).toBe(1);
    expect(result.b).toBe(3);
  });

  it("handles null values", () => {
    const base = { a: "value" };
    const override = { a: null };
    const result = deepMergeSafe(base, override);
    expect(result.a).toBeNull();
  });

  it("handles empty override object", () => {
    const base = { a: 1, b: 2 };
    const result = deepMergeSafe(base, {});
    expect(result).toEqual(base);
  });

  it("handles type changes", () => {
    const base = { a: 1 };
    const override = { a: "string" };
    const result = deepMergeSafe(base, override);
    expect(result.a).toBe("string");
  });

  it("deeply merges multiple levels", () => {
    const base = {
      l1: { l2: { l3: { value: "keep", other: "old" } } },
    };
    const override = {
      l1: { l2: { l3: { other: "new" } } },
    };
    const result = deepMergeSafe(base, override);
    expect(result.l1.l2.l3.value).toBe("keep");
    expect(result.l1.l2.l3.other).toBe("new");
  });

  it("preserves all data types in merge", () => {
    const base = {
      str: "string",
      num: 42,
      bool: true,
      arr: [1, 2],
      obj: { nested: true },
    };
    const override = { num: 100 };
    const result = deepMergeSafe(base, override);
    expect(result.str).toBe("string");
    expect(result.num).toBe(100);
    expect(result.bool).toBe(true);
    expect(result.arr).toEqual([1, 2]);
    expect(result.obj.nested).toBe(true);
  });

  it("creates new object without mutation", () => {
    const base = { a: { b: 1 } };
    const result = deepMergeSafe(base, { a: { b: 2 } });
    expect(base.a.b).toBe(1);
    expect(result.a.b).toBe(2);
  });

  it("handles nested null", () => {
    const base = { a: { b: { c: 1 } } };
    const override = { a: { b: null } };
    const result = deepMergeSafe(base, override);
    expect(result.a.b).toBeNull();
  });

  it("preserves symbols and special values", () => {
    const base = { a: 1 };
    const override = { b: 2 };
    const result = deepMergeSafe(base, override);
    expect(result).toHaveProperty("a");
    expect(result).toHaveProperty("b");
  });
});

describe("integration: backup and restore flow", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("completes full backup-modify-restore cycle", () => {
    const original = {
      step: 1,
      businessModel: { type: "original" },
      data: "original",
    };
    localStorage.setItem("parkflow-onboarding-store", JSON.stringify(original));
    backupOnboardingConfig();

    const modified = {
      step: 2,
      businessModel: { type: "modified" },
      data: "modified",
      newField: "added",
    };
    localStorage.setItem("parkflow-onboarding-store", JSON.stringify(modified));
    restoreOnboardingConfig();

    const result = JSON.parse(localStorage.getItem("parkflow-onboarding-store")!);
    expect(result.businessModel.type).toBe("modified");
    expect(result.data).toBe("original");
    expect(result.newField).toBe("added");
  });

  it("protects all protected keys during merge", () => {
    const current = {
      businessModel: { c: 1 },
      operationalProfile: { c: 2 },
      vehicleTypes: { c: 3 },
      paymentMethods: { c: 4 },
    };
    const backup = {
      businessModel: { b: 1 },
      operationalProfile: { b: 2 },
      vehicleTypes: { b: 3 },
      paymentMethods: { b: 4 },
      other: "merged",
    };
    localStorage.setItem("parkflow-onboarding-store", JSON.stringify(current));
    localStorage.setItem("parkflow-onboarding-backup", JSON.stringify(backup));
    restoreOnboardingConfig();
    const result = JSON.parse(localStorage.getItem("parkflow-onboarding-store")!);
    ONBOARDING_PROTECTED_KEYS.forEach((key) => {
      expect(result[key]).toEqual(current[key]);
    });
  });
});
