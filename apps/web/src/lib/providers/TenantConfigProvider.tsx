"use client";

import { useEffect, useCallback, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { fetchRuntimeConfig, type RuntimeConfig } from "@/lib/runtime-config";

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
  const { data: runtimeConfig, error: swrError, isLoading, mutate } = useSWR<RuntimeConfig | null>(
    "tenant-runtime-config",
    fetchRuntimeConfig,
    {
      revalidateOnFocus: false,
    }
  );

  const loading = isLoading;
  const error = !!swrError;

  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  useEffect(() => {
    const handleRefreshRequest = () => {
      void globalMutate("tenant-runtime-config");
    };
    window.addEventListener("parkflow-refresh-runtime-config", handleRefreshRequest);
    return () => window.removeEventListener("parkflow-refresh-runtime-config", handleRefreshRequest);
  }, []);

  const supportsVehicleType = useCallback((typeCode: string): boolean => {
    if (!runtimeConfig?.vehicleTypes) return false;
    return runtimeConfig.vehicleTypes.includes(typeCode);
  }, [runtimeConfig]);

  const isModuleEnabled = useCallback((moduleKey: string): boolean => {
    if (!runtimeConfig?.modules) return false;
    const value = runtimeConfig.modules[moduleKey];
    return typeof value === "boolean" ? value : false;
  }, [runtimeConfig]);

  const isFeatureEnabled = useCallback((featureKey: string): boolean => {
    if (!runtimeConfig?.features) return true;
    const value = runtimeConfig.features[featureKey];
    return typeof value === "boolean" ? value : true;
  }, [runtimeConfig]);

  const getOperationConfigValue = useCallback(<T,>(key: string, defaultValue: T): T => {
    if (!runtimeConfig?.operationConfiguration) return defaultValue;
    const value = runtimeConfig.operationConfiguration[key];
    return value !== undefined ? (value as T) : defaultValue;
  }, [runtimeConfig]);

  return useMemo(
    () => ({
      runtimeConfig: runtimeConfig ?? null,
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

// Para compatibilidad y evitar fallos al eliminar el Provider de app/providers.tsx
export function TenantConfigProvider({ children }: { children: React.ReactNode }) {
  // Inicializamos la data temprano, pero retornamos children directamente
  useTenantConfig();
  return <>{children}</>;
}
