"use client";

import React from "react";
import { useTenantConfig } from "@/lib/hooks/useTenantConfig";

interface FeatureGuardProps {
  vehicleType?: string;
  module?: string;
  configKey?: string;
  configValueEquals?: unknown;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGuard({
  vehicleType,
  module,
  configKey,
  configValueEquals = true,
  children,
  fallback = null,
}: FeatureGuardProps) {
  const { supportsVehicleType, isModuleEnabled, getOperationConfigValue } = useTenantConfig();

  if (vehicleType && !supportsVehicleType(vehicleType)) {
    return <>{fallback}</>;
  }

  if (module && !isModuleEnabled(module)) {
    return <>{fallback}</>;
  }

  if (configKey) {
    // Si configValueEquals es el valor por defecto (true), podemos chequear si es !== false
    const configValue = getOperationConfigValue<unknown>(configKey, undefined);
    
    if (configValueEquals === true) {
      if (configValue === false) {
        return <>{fallback}</>;
      }
    } else {
      if (configValue !== configValueEquals) {
        return <>{fallback}</>;
      }
    }
  }

  return <>{children}</>;
}
