import { resolveCurrentCompanyId } from "@/lib/current-company";
import { authHeaders } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6011/api/v1";

export type RuntimeConfig = {
  vehicleTypes?: string[];
  paymentMethods?: string[];
  sites?: Array<{ code: string; name: string }>;
  modules?: Record<string, boolean>;
  wizard?: Record<string, Record<string, unknown>>;
};

export async function fetchRuntimeConfig(): Promise<RuntimeConfig | null> {
  const companyId = await resolveCurrentCompanyId();
  if (!companyId) return null;
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/onboarding/companies/${companyId}/settings`, { headers, cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as RuntimeConfig;
}

export function shouldShowModule(config: RuntimeConfig | null, key: string, defaultValue = true): boolean {
  if (!config?.modules) return defaultValue;
  const value = config.modules[key];
  return typeof value === "boolean" ? value : defaultValue;
}
