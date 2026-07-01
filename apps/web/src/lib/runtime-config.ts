import { resolveCurrentCompanyId } from "@/lib/current-company";
import { authHeaders } from "@/lib/services/auth-domain.service";
import { apiBase } from "@/lib/api/config";
import { safeFetch } from "@/lib/api/fetch";


export type RuntimeConfig = {
  vehicleTypes?: string[];
  paymentMethods?: string[];
  sites?: Array<{ code: string; name: string }>;
  modules?: Partial<Record<"cash", boolean>> & Record<string, boolean>; // Allows any but explicitly tracks cash
  features?: Partial<Record<
    "agreements" | "prepaid" | "memberships" | "frequentCustomers" | "electronicBilling" | "specialRates" | "reservations" | "lockerControl" | "helmetControl" | "accessoryControl" | "operation24Hours" | "motorcycleParking" | "bicycleParking",
    boolean
  >> & Record<string, boolean>; // Partial type safety for known features
  wizard?: Record<string, Record<string, unknown>>;
  operationConfiguration?: Record<string, unknown>;
  businessModel?: string;
  operationalProfile?: string;
  capacity?: {
    controlSlots: boolean;
    total: number;
    byType?: Record<string, number>;
  };
  rates?: {
    type: string;
    baseValue: number;
    byType?: Record<string, number>;
    minRateMinutes?: number;
    dailyRate?: number;
    nightRate?: number;
    graceMinutes?: number;
  };
  region?: {
    countryCode: string;
    platePattern: string;
    platePrefix: string;
  };
  tickets?: {
    delivery: string[];
    allowReprint: boolean;
    showTicketPreview: boolean;
    printerType: string;
    printerName: string;
    thermalPrinter: boolean;
  };
  shifts?: {
    enabled: boolean;
    dayShiftStart?: string;
    dayShiftEnd?: string;
    nightShiftStart?: string;
    nightShiftEnd?: string;
  };
  agreements?: {
    enabled: boolean;
    discount: number;
  };
};

export async function fetchRuntimeConfig(): Promise<RuntimeConfig | null> {
  const companyId = await resolveCurrentCompanyId();
  if (!companyId) return null;
  const headers = await authHeaders();
  try {
    return await safeFetch<RuntimeConfig>(`${apiBase()}/onboarding/companies/${companyId}/settings`, {
      headers: {
        ...headers,
        "X-Parkflow-Auth-Toast-Silent": "1"
      },
      cache: "no-store"
    });
  } catch (err) {
    // Silently swallow network errors (API not ready, CORS, etc.)
    console.warn("[RuntimeConfig] Failed to fetch config, returning null:", err);
    return null;
  }
}

