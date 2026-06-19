"use client";

import { useEffect, useCallback, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
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
  const storeLoading = useTenantStore((s) => s.loading);
  const storeError = useTenantStore((s) => s.error);
  const fetchConfig = useTenantStore((s) => s.fetchConfig);

  const { data: swrData, error: swrError, isLoading, mutate } = useSWR<RuntimeConfig | null>(
    "tenant-runtime-config",
    fetchRuntimeConfig,
    {
      revalidateOnFocus: false,
    }
  );

  const data = runtimeConfig ?? swrData;
  const loading = storeLoading || isLoading;
  const error = storeError || !!swrError;

  useEffect(() => {
    if (swrData && !runtimeConfig) {
      useTenantStore.setState({ runtimeConfig: swrData, loading: false });
    }
  }, [swrData, runtimeConfig]);

  const refresh = useCallback(async () => {
    await mutate();
    await fetchConfig();
  }, [mutate, fetchConfig]);

  useEffect(() => {
    const handleRefreshRequest = () => {
      void globalMutate("tenant-runtime-config");
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
      runtimeConfig: data ?? null,
      loading,
      error,
      refresh,
      supportsVehicleType,
      isModuleEnabled,
      isFeatureEnabled,
      getOperationConfigValue,
    }),
    [data, loading, error, refresh, supportsVehicleType, isModuleEnabled, isFeatureEnabled, getOperationConfigValue],
  );
}

// Compat — hydrates store early
export function TenantConfigProvider({ children }: { children: React.ReactNode }) {
  useTenantConfig();
  return <>{children}</>;
}
