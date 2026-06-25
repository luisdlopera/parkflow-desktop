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
  cash: boolean;
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
  cash: true,
};

export function useFeatureFlags(): FeatureFlags {
  const { runtimeConfig } = useTenantConfig();

  return useMemo(() => {
    if (!runtimeConfig) return DEFAULT_FLAGS;

    const vehicleTypes = runtimeConfig.vehicleTypes || [];
    const features = runtimeConfig.features || {};
    const opConfig = runtimeConfig.operationConfiguration || {};
    const modules = runtimeConfig.modules || {};

    return {
      // Optional business features: only show if explicitly enabled in settings.
      // Defaulting to false prevents UI from showing disabled modules when
      // onboarding has set them to false but features map hasn't been fetched yet.
      agreements: features.agreements === true,
      prepaidPlans: features.prepaid === true,
      memberships: features.memberships === true,
      loyaltyCustomers: features.frequentCustomers === true,
      electronicInvoicing: features.electronicBilling === true,
      specialRates: features.specialRates === true,
      reservations: features.reservations === true,
      // Operational features: use vehicle types as primary signal, fall back to feature flag.
      lockers: opConfig.helmetHandling === "LOCKERS" || features.lockerControl === true,
      helmets: features.helmetControl === true || (opConfig.helmetHandling !== undefined && opConfig.helmetHandling !== "NONE"),
      accessories: features.accessoryControl === true,
      operation24Hours: features.operation24Hours === true,
      motorcycles: vehicleTypes.includes("MOTORCYCLE") || features.motorcycleParking === true,
      bicycles: vehicleTypes.includes("BICYCLE") || features.bicycleParking === true,
      cash: typeof modules.cash === "boolean" ? modules.cash : true,
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
