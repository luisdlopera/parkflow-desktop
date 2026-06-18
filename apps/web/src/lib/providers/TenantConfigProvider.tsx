"use client";

import React, { createContext, useContext, useEffect, useCallback, useMemo } from "react";
import useSWR from "swr";
import { fetchRuntimeConfig, type RuntimeConfig } from "@/lib/runtime-config";

interface TenantConfigContextType {
  runtimeConfig: RuntimeConfig | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  supportsVehicleType: (typeCode: string) => boolean;
  isModuleEnabled: (moduleKey: string) => boolean;
  getOperationConfigValue: <T>(key: string, defaultValue: T) => T;
}

const TenantConfigContext = createContext<TenantConfigContextType | null>(null);

export function TenantConfigProvider({ children }: { children: React.ReactNode }) {
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
      void mutate();
    };
    window.addEventListener("parkflow-refresh-runtime-config", handleRefreshRequest);
    return () => window.removeEventListener("parkflow-refresh-runtime-config", handleRefreshRequest);
  }, [mutate]);

  const supportsVehicleType = useCallback((typeCode: string): boolean => {
    if (!runtimeConfig?.vehicleTypes) return false;
    return runtimeConfig.vehicleTypes.includes(typeCode);
  }, [runtimeConfig]);

  const isModuleEnabled = useCallback((moduleKey: string): boolean => {
    if (!runtimeConfig?.modules) return false;
    const value = runtimeConfig.modules[moduleKey];
    return typeof value === "boolean" ? value : false;
  }, [runtimeConfig]);

  const getOperationConfigValue = useCallback(<T,>(key: string, defaultValue: T): T => {
    if (!runtimeConfig?.operationConfiguration) return defaultValue;
    const value = runtimeConfig.operationConfiguration[key];
    return value !== undefined ? (value as T) : defaultValue;
  }, [runtimeConfig]);

  const value = useMemo(
    () => ({
      runtimeConfig: runtimeConfig ?? null,
      loading,
      error,
      refresh,
      supportsVehicleType,
      isModuleEnabled,
      getOperationConfigValue,
    }),
    [runtimeConfig, loading, error, refresh, supportsVehicleType, isModuleEnabled, getOperationConfigValue],
  );

  return (
    <TenantConfigContext.Provider value={value}>
      {children}
    </TenantConfigContext.Provider>
  );
}

export function useTenantConfig() {
  const context = useContext(TenantConfigContext);
  if (!context) {
    throw new Error("useTenantConfig must be used within a TenantConfigProvider");
  }
  return context;
}
