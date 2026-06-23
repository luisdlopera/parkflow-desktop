import { describe, it, expect, beforeEach } from "vitest";
import { useTenantStore } from "../tenant.store";
import type { RuntimeConfig } from "@/lib/runtime-config";

const initialState = {
  runtimeConfig: null,
  loading: false,
  error: false,
};

const mockConfig: RuntimeConfig = {
  vehicleTypes: ["CAR", "MOTORCYCLE"],
  paymentMethods: ["CASH", "CARD"],
  modules: { cash: true, prepaid: false },
  features: { agreements: true, prepaid: false },
};

beforeEach(() => {
  useTenantStore.setState(initialState);
});

describe("useTenantStore", () => {
  it("has correct initial state", () => {
    const state = useTenantStore.getState();
    expect(state.runtimeConfig).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBe(false);
  });

  describe("setRuntimeConfig (via setState)", () => {
    it("sets runtimeConfig", () => {
      useTenantStore.setState({ runtimeConfig: mockConfig });
      expect(useTenantStore.getState().runtimeConfig).toEqual(mockConfig);
    });
  });

  describe("loading state", () => {
    it("can be set to true", () => {
      useTenantStore.setState({ loading: true });
      expect(useTenantStore.getState().loading).toBe(true);
    });

    it("can be set to false", () => {
      useTenantStore.setState({ loading: true });
      useTenantStore.setState({ loading: false });
      expect(useTenantStore.getState().loading).toBe(false);
    });
  });

  describe("error state", () => {
    it("can be set to true", () => {
      useTenantStore.setState({ error: true });
      expect(useTenantStore.getState().error).toBe(true);
    });

    it("can be set to false", () => {
      useTenantStore.setState({ error: true });
      useTenantStore.setState({ error: false });
      expect(useTenantStore.getState().error).toBe(false);
    });
  });

  describe("supportsVehicleType", () => {
    it("returns true when type is in the vehicleTypes array", () => {
      useTenantStore.setState({ runtimeConfig: mockConfig });
      expect(useTenantStore.getState().supportsVehicleType("CAR")).toBe(true);
      expect(useTenantStore.getState().supportsVehicleType("MOTORCYCLE")).toBe(true);
    });

    it("returns false when type is not in vehicleTypes", () => {
      useTenantStore.setState({ runtimeConfig: mockConfig });
      expect(useTenantStore.getState().supportsVehicleType("TRUCK")).toBe(false);
    });

    it("returns false when runtimeConfig is null", () => {
      expect(useTenantStore.getState().supportsVehicleType("CAR")).toBe(false);
    });

    it("returns false when vehicleTypes is undefined", () => {
      useTenantStore.setState({ runtimeConfig: {} });
      expect(useTenantStore.getState().supportsVehicleType("CAR")).toBe(false);
    });
  });

  describe("hasPaymentMethod (via isModuleEnabled)", () => {
    it("returns true for an enabled module", () => {
      useTenantStore.setState({ runtimeConfig: mockConfig });
      expect(useTenantStore.getState().isModuleEnabled("cash")).toBe(true);
    });

    it("returns false for a disabled module", () => {
      useTenantStore.setState({ runtimeConfig: mockConfig });
      expect(useTenantStore.getState().isModuleEnabled("prepaid")).toBe(false);
    });

    it("returns false for a non-existent module key", () => {
      useTenantStore.setState({ runtimeConfig: mockConfig });
      expect(useTenantStore.getState().isModuleEnabled("nonexistent")).toBe(false);
    });

    it("returns false when runtimeConfig is null", () => {
      expect(useTenantStore.getState().isModuleEnabled("cash")).toBe(false);
    });
  });

  describe("isFeatureEnabled", () => {
    it("returns true for an enabled feature", () => {
      useTenantStore.setState({ runtimeConfig: mockConfig });
      expect(useTenantStore.getState().isFeatureEnabled("agreements")).toBe(true);
    });

    it("returns false for a disabled feature", () => {
      useTenantStore.setState({ runtimeConfig: mockConfig });
      expect(useTenantStore.getState().isFeatureEnabled("prepaid")).toBe(false);
    });

    it("returns true for a non-existent feature (default)", () => {
      useTenantStore.setState({ runtimeConfig: mockConfig });
      expect(useTenantStore.getState().isFeatureEnabled("nonexistent")).toBe(true);
    });

    it("returns true when runtimeConfig.features is undefined", () => {
      useTenantStore.setState({ runtimeConfig: {} });
      expect(useTenantStore.getState().isFeatureEnabled("anything")).toBe(true);
    });

    it("returns true when runtimeConfig is null", () => {
      expect(useTenantStore.getState().isFeatureEnabled("agreements")).toBe(true);
    });
  });

  describe("getOperationConfigValue", () => {
    it("returns the value for an existing key", () => {
      useTenantStore.setState({ runtimeConfig: { operationConfiguration: { graceMinutes: 15 } } });
      expect(useTenantStore.getState().getOperationConfigValue("graceMinutes", 0)).toBe(15);
    });

    it("returns the default value for a non-existent key", () => {
      useTenantStore.setState({ runtimeConfig: { operationConfiguration: {} } });
      expect(useTenantStore.getState().getOperationConfigValue("nonexistent", "fallback")).toBe("fallback");
    });

    it("returns the default when operationConfiguration is undefined", () => {
      useTenantStore.setState({ runtimeConfig: {} });
      expect(useTenantStore.getState().getOperationConfigValue("graceMinutes", 10)).toBe(10);
    });

    it("returns the default when runtimeConfig is null", () => {
      expect(useTenantStore.getState().getOperationConfigValue("graceMinutes", 5)).toBe(5);
    });
  });
});
