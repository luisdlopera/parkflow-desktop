"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { fetchRuntimeConfig } from "@/lib/runtime-config";

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

const FeatureFlagContext = createContext<FeatureFlags>(DEFAULT_FLAGS);

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);

  useEffect(() => {
    // In a real scenario we could use SWR, but keeping it simple like the runtime config
    fetchRuntimeConfig().then((config) => {
      if (!config) return;
      
      const vehicleTypes = config.vehicleTypes || [];
      const features = config.features || {};
      const modules = config.modules || {};
      const opConfig = config.operationConfiguration || {};
      
      setFlags({
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
      });
    }).catch((e) => console.error("Error fetching feature flags", e));
  }, []);

  return (
    <FeatureFlagContext.Provider value={flags}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlags {
  return useContext(FeatureFlagContext);
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
