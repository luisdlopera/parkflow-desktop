import { describe, it, expect, beforeEach } from "vitest";
import {
  deepMergeSafe,
  backupOnboardingConfig,
  restoreOnboardingConfig,
  ONBOARDING_PROTECTED_KEYS
} from "./config-merge";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe("config-merge", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

describe("deepMergeSafe", () => {
  it("merges simple flat objects", () => {
    const base = { a: 1, b: 2 };
    const override = { b: 3, c: 4 };
    const result = deepMergeSafe(base, override);

    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("overwrites base values with override", () => {
    const base = { name: "Alice", age: 30 };
    const override = { age: 31 };
    const result = deepMergeSafe(base, override);

    expect(result.age).toBe(31);
    expect(result.name).toBe("Alice");
  });

  it.each([
    [{ a: 1 }, { a: 2 }, { a: 2 }],
    [{ x: "old" }, { x: "new" }, { x: "new" }],
    [{ val: 0 }, { val: 1 }, { val: 1 }],
  ])("overwrites values: %p + %p -> %p", (base, override, expected) => {
    const result = deepMergeSafe(base, override);
    expect(result).toEqual(expected);
  });

  it("adds new keys from override", () => {
    const base = { a: 1 };
    const override = { b: 2, c: 3 };
    const result = deepMergeSafe(base, override);

    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("preserves base keys not in override", () => {
    const base = { a: 1, b: 2, c: 3 };
    const override = { b: 20 };
    const result = deepMergeSafe(base, override);

    expect(result).toEqual({ a: 1, b: 20, c: 3 });
  });

  it("deeply merges nested objects", () => {
    const base = {
      user: { name: "Alice", age: 30 },
      settings: { theme: "dark" },
    };
    const override = {
      user: { age: 31 },
      settings: { lang: "es" },
    };
    const result = deepMergeSafe(base, override);

    expect(result).toEqual({
      user: { name: "Alice", age: 31 },
      settings: { theme: "dark", lang: "es" },
    });
  });

  it("handles nested overrides", () => {
    const base = { config: { db: { host: "localhost", port: 5432 } } };
    const override = { config: { db: { port: 3306 } } };
    const result = deepMergeSafe(base, override);

    expect(result.config.db.host).toBe("localhost");
    expect(result.config.db.port).toBe(3306);
  });

  it.each([
    [
      { a: { b: 1 } },
      { a: { b: 2 } },
      { a: { b: 2 } },
    ],
    [
      { x: { y: { z: 1 } } },
      { x: { y: { z: 2 } } },
      { x: { y: { z: 2 } } },
    ],
  ])("deeply merges nested: %p + %p -> %p", (base, override, expected) => {
    const result = deepMergeSafe(base, override);
    expect(result).toEqual(expected);
  });

  it("replaces arrays instead of merging them", () => {
    const base = { items: [1, 2, 3] };
    const override = { items: [4, 5] };
    const result = deepMergeSafe(base, override);

    expect(result.items).toEqual([4, 5]);
  });

  it("skips undefined values in override", () => {
    const base = { a: 1, b: 2 };
    const override = { b: undefined };
    const result = deepMergeSafe(base, override);

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it.each([
    [{ a: 1 }, { a: undefined }, { a: 1 }],
    [{ x: "keep" }, { x: undefined }, { x: "keep" }],
  ])("skips undefined: %p + %p -> %p", (base, override, expected) => {
    const result = deepMergeSafe(base, override);
    expect(result).toEqual(expected);
  });

  it("handles null values from override", () => {
    const base = { a: 1, b: 2 };
    const override = { b: null };
    const result = deepMergeSafe(base, override);

    expect(result.b).toBeNull();
  });

  it("handles empty override object", () => {
    const base = { a: 1, b: 2 };
    const override = {};
    const result = deepMergeSafe(base, override);

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("handles empty base object", () => {
    const base = {};
    const override = { a: 1, b: 2 };
    const result = deepMergeSafe(base, override);

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("handles null override gracefully", () => {
    const base = { a: 1 };
    const result = deepMergeSafe(base, null as any);

    expect(result).toEqual({ a: 1 });
  });

  it("handles undefined override gracefully", () => {
    const base = { a: 1 };
    const result = deepMergeSafe(base, undefined as any);

    expect(result).toEqual({ a: 1 });
  });

  it("does not mutate base object", () => {
    const base = { a: { b: 1 } };
    const baseCopy = JSON.parse(JSON.stringify(base));
    const override = { a: { b: 2 } };

    deepMergeSafe(base, override);

    expect(base).toEqual(baseCopy);
  });

  it("does not mutate override object", () => {
    const base = { a: 1 };
    const override = { b: 2 };
    const overrideCopy = JSON.parse(JSON.stringify(override));

    deepMergeSafe(base, override);

    expect(override).toEqual(overrideCopy);
  });

  it("handles deeply nested structures", () => {
    const base = {
      level1: {
        level2: {
          level3: {
            value: "original",
          },
        },
      },
    };
    const override = {
      level1: {
        level2: {
          level3: {
            value: "updated",
          },
        },
      },
    };
    const result = deepMergeSafe(base, override);

    expect(result.level1.level2.level3.value).toBe("updated");
  });

  it("handles mixed types correctly", () => {
    const base = {
      string: "text",
      number: 42,
      boolean: true,
      nested: { value: 1 },
      array: [1, 2, 3],
    };
    const override = {
      string: "updated",
      number: 100,
      boolean: false,
      nested: { value: 2 },
      array: [4, 5],
    };
    const result = deepMergeSafe(base, override);

    expect(result.string).toBe("updated");
    expect(result.number).toBe(100);
    expect(result.boolean).toBe(false);
    expect(result.nested.value).toBe(2);
    expect(result.array).toEqual([4, 5]);
  });

  it("handles special JSON values", () => {
    const base = { a: 1 };
    const override = { b: null, c: false, d: 0, e: "" };
    const result = deepMergeSafe(base, override);

    expect(result.b).toBeNull();
    expect(result.c).toBe(false);
    expect(result.d).toBe(0);
    expect(result.e).toBe("");
  });

  it.each([
    [{ a: 1 }, { a: 1 }, { a: 1 }],
    [{ a: 1, b: 2 }, { a: 1 }, { a: 1, b: 2 }],
    [{ a: { b: 1 } }, { a: { b: 1 } }, { a: { b: 1 } }],
  ])("idempotent merge: %p", (base, override, expected) => {
    const result1 = deepMergeSafe(base, override);
    const result2 = deepMergeSafe(result1, override);
    expect(result2).toEqual(expected);
  });

  it("handles configuration-like structures", () => {
    const baseConfig = {
      app: {
        name: "ParkFlow",
        version: "1.0.0",
        debug: false,
      },
      db: {
        host: "localhost",
        port: 5432,
      },
    };
    const overrideConfig = {
      app: {
        debug: true,
      },
      db: {
        port: 3306,
      },
    };
    const result = deepMergeSafe(baseConfig, overrideConfig);

    expect(result.app.name).toBe("ParkFlow");
    expect(result.app.debug).toBe(true);
    expect(result.db.host).toBe("localhost");
    expect(result.db.port).toBe(3306);
  });

  it("handles feature flags merging", () => {
    const baseFlags = {
      features: {
        newUI: false,
        betaAPI: false,
        darkMode: true,
      },
    };
    const overrideFlags = {
      features: {
        newUI: true,
        darkMode: false,
      },
    };
    const result = deepMergeSafe(baseFlags, overrideFlags);

    expect(result.features.newUI).toBe(true);
    expect(result.features.betaAPI).toBe(false);
    expect(result.features.darkMode).toBe(false);
  });
  });

  describe("backupOnboardingConfig()", () => {
    it("stores current onboarding config to backup key", () => {
      const config = JSON.stringify({ step: 1, data: "test" });
      localStorageMock.setItem("parkflow-onboarding-store", config);

      backupOnboardingConfig();

      const backup = localStorageMock.getItem("parkflow-onboarding-backup");
      expect(backup).toEqual(config);
    });

    it("does nothing if onboarding store does not exist", () => {
      backupOnboardingConfig();

      const backup = localStorageMock.getItem("parkflow-onboarding-backup");
      expect(backup).toBeNull();
    });

    it("overwrites previous backup", () => {
      localStorageMock.setItem("parkflow-onboarding-backup", "old backup");
      localStorageMock.setItem("parkflow-onboarding-store", "new data");

      backupOnboardingConfig();

      expect(localStorageMock.getItem("parkflow-onboarding-backup")).toBe("new data");
    });

    it("handles undefined window gracefully", () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      expect(() => backupOnboardingConfig()).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe("restoreOnboardingConfig()", () => {
    it("restores config from backup if no current config exists", () => {
      const backupData = JSON.stringify({ restored: true });
      localStorageMock.setItem("parkflow-onboarding-backup", backupData);

      restoreOnboardingConfig();

      expect(localStorageMock.getItem("parkflow-onboarding-store")).toEqual(backupData);
      expect(localStorageMock.getItem("parkflow-onboarding-backup")).toBeNull();
    });

    it("merges backup and current config, protecting keys", () => {
      const current = JSON.stringify({
        businessModel: { type: "A" },
        operationalProfile: { mode: "manual" },
        otherData: "new"
      });
      const backup = JSON.stringify({
        businessModel: { type: "B" },
        operationalProfile: { mode: "auto" },
        otherData: "old",
        newFieldFromBackup: "backup-value"
      });

      localStorageMock.setItem("parkflow-onboarding-store", current);
      localStorageMock.setItem("parkflow-onboarding-backup", backup);

      restoreOnboardingConfig();

      const merged = JSON.parse(
        localStorageMock.getItem("parkflow-onboarding-store")!
      );

      // Protected keys should keep current values
      expect(merged.businessModel).toEqual({ type: "A" });
      expect(merged.operationalProfile).toEqual({ mode: "manual" });
      // Existing non-protected keys are overwritten by backup (merge overwrites from source)
      expect(merged.otherData).toBe("old");
      // New fields from backup are added
      expect(merged.newFieldFromBackup).toBe("backup-value");
    });

    it("removes backup key after restore", () => {
      localStorageMock.setItem("parkflow-onboarding-backup", "data");
      localStorageMock.setItem("parkflow-onboarding-store", "current");

      restoreOnboardingConfig();

      expect(localStorageMock.getItem("parkflow-onboarding-backup")).toBeNull();
    });

    it("does nothing if no backup exists", () => {
      const current = JSON.stringify({ data: "test" });
      localStorageMock.setItem("parkflow-onboarding-store", current);

      restoreOnboardingConfig();

      expect(localStorageMock.getItem("parkflow-onboarding-store")).toEqual(current);
    });

    it("handles malformed JSON in current config by restoring from backup", () => {
      localStorageMock.setItem("parkflow-onboarding-store", "invalid json {");
      const backupData = JSON.stringify({ restored: true });
      localStorageMock.setItem("parkflow-onboarding-backup", backupData);

      restoreOnboardingConfig();

      expect(localStorageMock.getItem("parkflow-onboarding-store")).toEqual(backupData);
    });

    it("handles malformed JSON in backup gracefully", () => {
      localStorageMock.setItem("parkflow-onboarding-backup", "invalid {");

      // Should not throw
      expect(() => restoreOnboardingConfig()).not.toThrow();
    });

    it("protects all specified keys during merge", () => {
      const current = JSON.stringify({
        businessModel: { new: "value1" },
        operationalProfile: { new: "value2" },
        vehicleTypes: { new: "value3" },
        paymentMethods: { new: "value4" },
        other: "current"
      });
      const backup = JSON.stringify({
        businessModel: { old: "value1" },
        operationalProfile: { old: "value2" },
        vehicleTypes: { old: "value3" },
        paymentMethods: { old: "value4" },
        other: "backup"
      });

      localStorageMock.setItem("parkflow-onboarding-store", current);
      localStorageMock.setItem("parkflow-onboarding-backup", backup);

      restoreOnboardingConfig();

      const merged = JSON.parse(
        localStorageMock.getItem("parkflow-onboarding-store")!
      );

      // All protected keys should keep their current values
      expect(merged.businessModel).toEqual({ new: "value1" });
      expect(merged.operationalProfile).toEqual({ new: "value2" });
      expect(merged.vehicleTypes).toEqual({ new: "value3" });
      expect(merged.paymentMethods).toEqual({ new: "value4" });
    });

    it("handles undefined window gracefully", () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      expect(() => restoreOnboardingConfig()).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe("ONBOARDING_PROTECTED_KEYS", () => {
    it("contains expected keys", () => {
      expect(ONBOARDING_PROTECTED_KEYS).toContain("businessModel");
      expect(ONBOARDING_PROTECTED_KEYS).toContain("operationalProfile");
      expect(ONBOARDING_PROTECTED_KEYS).toContain("vehicleTypes");
      expect(ONBOARDING_PROTECTED_KEYS).toContain("paymentMethods");
    });

    it("has exactly 4 protected keys", () => {
      expect(ONBOARDING_PROTECTED_KEYS).toHaveLength(4);
    });

    it("all protected keys are strings", () => {
      ONBOARDING_PROTECTED_KEYS.forEach(key => {
        expect(typeof key).toBe("string");
      });
    });

    it("protected keys are not empty", () => {
      ONBOARDING_PROTECTED_KEYS.forEach(key => {
        expect(key.length).toBeGreaterThan(0);
      });
    });

    it("protected keys match camelCase pattern", () => {
      ONBOARDING_PROTECTED_KEYS.forEach(key => {
        expect(key).toMatch(/^[a-z][a-zA-Z]*$/);
      });
    });
  });
});
