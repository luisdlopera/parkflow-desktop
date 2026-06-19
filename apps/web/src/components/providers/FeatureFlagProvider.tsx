"use client";

import React, { useMemo } from "react";
import { useTenantConfig } from "@/providers/TenantConfigProvider";

export interface FeatureFlags {
  agreements: boolean;
  prepaidPlans: boolean;
  memberships: boolean;
  loyaltyCustomers: boolean;
  electronicInvoicing: boolean;
  specialRates: boolean;
  lockers: boolean;
  helmets: boolean;
  accessories: boolean;
  reservations: boolean;
  operation24Hours: boolean;
  motorcycles: boolean;
  bicycles: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  agreements: false,
  prepaidPlans: false,
  memberships: false,
  loyaltyCustomers: false,
  electronicInvoicing: false,
  specialRates: false,
  lockers: false,
  helmets: false,
  accessories: false,
  reservations: false,
  operation24Hours: false,
  motorcycles: false,
  bicycles: false,
};

export function useFeatureFlags(): FeatureFlags {
  const { runtimeConfig } = useTenantConfig();

  return useMemo(() => {
    if (!runtimeConfig) return DEFAULT_FLAGS;

    const vehicleTypes = runtimeConfig.vehicleTypes || [];
    const features = runtimeConfig.features || {};
    const opConfig = runtimeConfig.operationConfiguration || {};

    return {
      agreements: !!features.agreements,
      prepaidPlans: !!features.prepaid,
      memberships: !!features.memberships,
      loyaltyCustomers: !!features.frequentCustomers,
      electronicInvoicing: !!features.electronicBilling,
      specialRates: !!features.specialRates,
      lockers: opConfig.helmetHandling === "LOCKERS" || !!features.lockerControl,
      helmets: !!features.helmetControl || opConfig.helmetHandling !== "NONE",
      accessories: !!features.accessoryControl,
      reservations: !!features.reservations,
      operation24Hours: !!features.operation24Hours,
      motorcycles: vehicleTypes.includes("MOTORCYCLE") || !!features.motorcycleParking,
      bicycles: vehicleTypes.includes("BICYCLE") || !!features.bicycleParking,
    };
  }, [runtimeConfig]);
}

export function useFeature(feature: keyof FeatureFlags): boolean {
  const flags = useFeatureFlags();
  return flags[feature];
}

export function FeatureGuard({
  feature,
  children,
  fallback = null,
}: {
  feature: keyof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const isEnabled = useFeature(feature);
  if (!isEnabled) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}

// Para compatibilidad
export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
