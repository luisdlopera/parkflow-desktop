"use client";

import { useEffect, useCallback, useMemo } from "react";
import { fetchRuntimeConfig, type RuntimeConfig } from "@/lib/runtime-config";
import { useTenantStore } from "@/lib/stores/tenant.store";

export interface TenantConfigContextType {
  runtimeConfig: RuntimeConfig | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  supportsVehicleType: (typeCode: string) => boolean;
  isModuleEnabled: (moduleKey: string) => boolean;
  isFeatureEnabled: (featureKey: string) => boolean;
  getOperationConfigValue: <T>(key: string, defaultValue: T) => T;
}

export function useTenantConfig(): TenantConfigContextType {
  const runtimeConfig = useTenantStore((s) => s.runtimeConfig);
  const loading = useTenantStore((s) => s.loading);
  const error = useTenantStore((s) => s.error);
  const fetchConfig = useTenantStore((s) => s.fetchConfig);

  useEffect(() => {
    if (!runtimeConfig && !loading && !error) {
      fetchConfig();
    }
  }, [runtimeConfig, loading, error, fetchConfig]);

  const refresh = useCallback(async () => {
    await fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    const handleRefreshRequest = () => {
      void fetchConfig();
    };
    window.addEventListener("parkflow-refresh-runtime-config", handleRefreshRequest);
    return () => window.removeEventListener("parkflow-refresh-runtime-config", handleRefreshRequest);
  }, [fetchConfig]);

  const supportsVehicleType = useCallback((typeCode: string): boolean => {
    return useTenantStore.getState().supportsVehicleType(typeCode);
  }, []);

  const isModuleEnabled = useCallback((moduleKey: string): boolean => {
    return useTenantStore.getState().isModuleEnabled(moduleKey);
  }, []);

  const isFeatureEnabled = useCallback((featureKey: string): boolean => {
    return useTenantStore.getState().isFeatureEnabled(featureKey);
  }, []);

  const getOperationConfigValue = useCallback(<T,>(key: string, defaultValue: T): T => {
    return useTenantStore.getState().getOperationConfigValue(key, defaultValue);
  }, []);

  return useMemo(
    () => ({
      runtimeConfig,
      loading,
      error,
      refresh,
      supportsVehicleType,
      isModuleEnabled,
      isFeatureEnabled,
      getOperationConfigValue,
    }),
    [runtimeConfig, loading, error, refresh, supportsVehicleType, isModuleEnabled, isFeatureEnabled, getOperationConfigValue],
  );
}

// Compat — hydrates store early
export function TenantConfigProvider({ children }: { children: React.ReactNode }) {
  useTenantConfig();
  return <>{children}</>;
}
