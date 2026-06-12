"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const config = await fetchRuntimeConfig();
      setRuntimeConfig(config);
    } catch (err) {
      console.error("Error fetching runtime config inside provider:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    // Evento personalizado si la configuración cambia en otra parte del sistema
    const handleRefreshRequest = () => {
      void refresh();
    };
    window.addEventListener("parkflow-refresh-runtime-config", handleRefreshRequest);
    return () => window.removeEventListener("parkflow-refresh-runtime-config", handleRefreshRequest);
  }, [refresh]);

  const supportsVehicleType = useCallback((typeCode: string): boolean => {
    if (!runtimeConfig?.vehicleTypes) return true; // Si no hay lista, por defecto soporta todo
    return runtimeConfig.vehicleTypes.includes(typeCode);
  }, [runtimeConfig]);

  const isModuleEnabled = useCallback((moduleKey: string): boolean => {
    if (!runtimeConfig?.modules) return true;
    const value = runtimeConfig.modules[moduleKey];
    return typeof value === "boolean" ? value : true;
  }, [runtimeConfig]);

  const getOperationConfigValue = useCallback(<T,>(key: string, defaultValue: T): T => {
    if (!runtimeConfig?.operationConfiguration) return defaultValue;
    const value = runtimeConfig.operationConfiguration[key];
    return value !== undefined ? (value as T) : defaultValue;
  }, [runtimeConfig]);

  return (
    <TenantConfigContext.Provider
      value={{
        runtimeConfig,
        loading,
        error,
        refresh,
        supportsVehicleType,
        isModuleEnabled,
        getOperationConfigValue,
      }}
    >
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
