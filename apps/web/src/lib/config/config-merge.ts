import { safeStorage } from "@/lib/utils/storage";

const BACKUP_KEY = "parkflow-onboarding-backup";

export const ONBOARDING_PROTECTED_KEYS = [
  "businessModel",
  "operationalProfile",
  "vehicleTypes",
  "paymentMethods",
];

export function backupOnboardingConfig(): void {
  if (typeof window === "undefined") return;
  const store = safeStorage.getItem("parkflow-onboarding-store");
  if (store) safeStorage.setItem(BACKUP_KEY, store);
}

export function restoreOnboardingConfig(): void {
  if (typeof window === "undefined") return;
  const backup = safeStorage.getItem(BACKUP_KEY);
  if (!backup) return;
  const current = safeStorage.getItem("parkflow-onboarding-store");
  if (current) {
    try {
      const currentData = JSON.parse(current);
      const backupData = JSON.parse(backup);
      const merged = deepMergeProtected(currentData, backupData, ONBOARDING_PROTECTED_KEYS);
      safeStorage.setItem("parkflow-onboarding-store", JSON.stringify(merged));
    } catch {
      safeStorage.setItem("parkflow-onboarding-store", backup);
    }
  } else {
    safeStorage.setItem("parkflow-onboarding-store", backup);
  }
  safeStorage.removeItem(BACKUP_KEY);
}

function deepMergeProtected(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  protectedKeys: string[],
): Record<string, unknown> {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (protectedKeys.includes(key) && key in result) continue;
    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMergeProtected(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>,
        protectedKeys,
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function deepMergeSafe(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...base };
  for (const [key, value] of Object.entries(override ?? {})) {
    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMergeSafe(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}
