import useSWR from "swr";
import { fetchRuntimeConfig, type RuntimeConfig } from "./runtime-config";

export function useRuntimeConfig() {
  const { data, error, isLoading, mutate } = useSWR<RuntimeConfig | null>(
    "runtime-config",
    fetchRuntimeConfig,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
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
