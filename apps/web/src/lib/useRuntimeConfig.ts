import useSWR from "swr";
import { fetchRuntimeConfig, type RuntimeConfig } from "./runtime-config";

export function useRuntimeConfig() {
  const { data, error, isLoading, mutate } = useSWR<RuntimeConfig | null>(
    "runtime-config",
    fetchRuntimeConfig,
    {
      revalidateOnFocus: false,
      // Keep deduplication window short so the UI picks up post-onboarding
      // changes quickly after the hard reload that completeOnboarding triggers.
      dedupingInterval: 5000,
    }
  );

  return {
    config: data,
    isLoading,
    error,
    mutate,
    hasModule: (key: string, defaultValue = true) => {
      if (!data?.modules) return defaultValue;
      const value = data.modules[key];
      return typeof value === "boolean" ? value : defaultValue;
    },
    hasFeature: (key: string, defaultValue = true) => {
      if (!data?.features) return defaultValue;
      const value = data.features[key];
      return typeof value === "boolean" ? value : defaultValue;
    },
    hasPaymentMethod: (method: string) => {
      if (!data?.paymentMethods) return true; // default optimistic
      return data.paymentMethods.includes(method);
    },
    hasVehicleType: (type: string) => {
      if (!data?.vehicleTypes) return true; // default optimistic
      return data.vehicleTypes.includes(type);
    }
  };
}
