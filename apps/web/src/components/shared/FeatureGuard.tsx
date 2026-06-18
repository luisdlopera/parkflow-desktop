"use client";

import React from "react";
import { useRuntimeConfig } from "@/lib/useRuntimeConfig";

interface FeatureGuardProps {
  vehicleType?: string;
  module?: string;
  feature?: string;
  configKey?: string;
  configValueEquals?: unknown;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGuard({
  vehicleType,
  module: moduleKey,
  feature,
  configKey,
  configValueEquals = true,
  children,
  fallback = null,
}: FeatureGuardProps) {
  const { hasVehicleType, hasModule, config } = useRuntimeConfig();

  if (vehicleType && !hasVehicleType(vehicleType)) {
    return <>{fallback}</>;
  }

  if (moduleKey && !hasModule(moduleKey)) {
    return <>{fallback}</>;
  }

  if (feature) {
    const featureValue = config?.features?.[feature];
    const isEnabled = typeof featureValue === "boolean" ? featureValue : true;
    if (!isEnabled) {
      return <>{fallback}</>;
    }
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
