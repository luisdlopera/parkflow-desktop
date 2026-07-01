import useSWR from "swr";
import { fetchRuntimeConfig, type RuntimeConfig } from "@/lib/runtime-config";

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
