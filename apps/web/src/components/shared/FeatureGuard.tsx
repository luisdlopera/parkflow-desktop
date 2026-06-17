"use client";

import React from "react";
import { useRuntimeConfig } from "@/lib/useRuntimeConfig";

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
  const { hasVehicleType, hasModule, config } = useRuntimeConfig();

  if (vehicleType && !hasVehicleType(vehicleType)) {
    return <>{fallback}</>;
  }

  if (module && !hasModule(module)) {
    return <>{fallback}</>;
  }

  if (configKey) {
    const configValue = config?.operationConfiguration?.[configKey];
    
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
