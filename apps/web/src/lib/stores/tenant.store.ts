import { create } from "zustand";
import { fetchRuntimeConfig, type RuntimeConfig } from "@/lib/runtime-config";

interface TenantState {
  runtimeConfig: RuntimeConfig | null;
  loading: boolean;
  error: boolean;
  fetchConfig: () => Promise<void>;
  supportsVehicleType: (typeCode: string) => boolean;
  isModuleEnabled: (moduleKey: string) => boolean;
  isFeatureEnabled: (featureKey: string) => boolean;
  getOperationConfigValue: <T>(key: string, defaultValue: T) => T;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  runtimeConfig: null,
  loading: false,
  error: false,

  fetchConfig: async () => {
    set({ loading: true, error: false });
    try {
      const config = await fetchRuntimeConfig();
      set({ runtimeConfig: config, loading: false });
    } catch {
      set({ error: true, loading: false });
    }
  },

  supportsVehicleType: (typeCode) => {
    const { runtimeConfig } = get();
    if (!runtimeConfig?.vehicleTypes) return false;
    return runtimeConfig.vehicleTypes.includes(typeCode);
  },

  isModuleEnabled: (moduleKey) => {
    const { runtimeConfig } = get();
    if (!runtimeConfig?.modules) return false;
    const value = runtimeConfig.modules[moduleKey];
    return typeof value === "boolean" ? value : false;
  },

  isFeatureEnabled: (featureKey) => {
    const { runtimeConfig } = get();
    if (!runtimeConfig?.features) return true;
    const value = runtimeConfig.features[featureKey];
    return typeof value === "boolean" ? value : true;
  },

  getOperationConfigValue: <T,>(key: string, defaultValue: T): T => {
    const { runtimeConfig } = get();
    if (!runtimeConfig?.operationConfiguration) return defaultValue;
    const value = runtimeConfig.operationConfiguration[key];
    return value !== undefined ? (value as T) : defaultValue;
  },
}));
