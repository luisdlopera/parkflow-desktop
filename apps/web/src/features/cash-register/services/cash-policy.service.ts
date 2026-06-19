import { cashPolicy as fetchCashPolicy, type CashPolicyDto } from "@/lib/cash/cash-api";
import { safeStorage } from "@/lib/utils/storage";

const LOCALSTORAGE_POLICY_KEY = "parkflow_cash_policy";

export function readCachedCashPolicy(): CashPolicyDto | null {
  try {
    const raw = safeStorage.getItem(LOCALSTORAGE_POLICY_KEY);
    return raw ? (JSON.parse(raw) as CashPolicyDto) : null;
  } catch {
    return null;
  }
}

export function writeCachedCashPolicy(policy: CashPolicyDto): void {
  safeStorage.setItem(LOCALSTORAGE_POLICY_KEY, JSON.stringify(policy));
}

export function clearCachedCashPolicy(): void {
  safeStorage.removeItem(LOCALSTORAGE_POLICY_KEY);
}

/**
 * Fetches the cash policy from the API and caches it locally.
 */
export async function getAndCacheCashPolicy(site?: string | null): Promise<CashPolicyDto> {
  const policy = await fetchCashPolicy(site);
  writeCachedCashPolicy(policy);
  return policy;
}
