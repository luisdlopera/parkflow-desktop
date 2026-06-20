import { authHeaders } from "@/features/auth/services/auth-domain.service";
import { normalizeApiError } from "@/lib/errors/normalize-api-error";
import { ApiError } from "@/lib/errors/api-error";
import { apiBase } from "@/lib/api/config";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";


const API_BASE = apiBase();

export type OnboardingStatus = {
  companyId: string;
  plan: "LOCAL" | "SYNC" | "PRO" | "ENTERPRISE";
  onboardingCompleted: boolean;
  currentStep: number;
  skipped: boolean;
  progressData: Record<string, unknown>;
  availableOptionsByPlan: Record<string, unknown>;
  enabledSteps: number[];
};

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const response = await fetchWithCredentials(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      "X-Parkflow-Auth-Toast-Silent": "1",
      ...options?.headers
    }
  });
  if (!response.ok) {
    const apiError = await normalizeApiError(response);
    throw apiError;
  }
  return (await response.json()) as T;
}

export async function fetchOnboardingStatus(companyId: string): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`/onboarding/companies/${companyId}`);
}

export async function saveOnboardingStep(companyId: string, step: number, data: Record<string, unknown>, targetStep?: number): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`/onboarding/companies/${companyId}/steps`, {
    method: "PUT",
    body: JSON.stringify({ step, data, targetStep })
  });
}

export async function skipOnboarding(companyId: string): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`/onboarding/companies/${companyId}/skip`, { method: "POST" });
}

export async function completeOnboarding(companyId: string): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`/onboarding/companies/${companyId}/complete`, { method: "POST" });
}

export async function resetOnboarding(companyId: string, reason: string = "Reinicio manual"): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`/onboarding/companies/${companyId}/reset?reason=${encodeURIComponent(reason)}`, { method: "POST" });
}
