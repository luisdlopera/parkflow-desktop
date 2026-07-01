/**
 * Onboarding Status & Progress API
 *
 * Manages company onboarding workflow and progress tracking.
 */
import { apiBase } from "@/lib/api/config";
import { apiFetch, buildApiHeaders } from "./_shared";

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

export async function fetchOnboardingStatus(companyId: string): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`${API_BASE}/onboarding/companies/${companyId}`, {
    headers: {
      ...(await buildApiHeaders()),
      "X-Parkflow-Auth-Toast-Silent": "1"
    }
  });
}

export async function saveOnboardingStep(
  companyId: string, 
  step: number, 
  data: Record<string, unknown>, 
  targetStep?: number,
  options?: RequestInit
): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`${API_BASE}/onboarding/companies/${companyId}/steps`, {
    ...options,
    method: "PUT",
    headers: {
      ...(await buildApiHeaders()),
      "X-Parkflow-Auth-Toast-Silent": "1",
      ...(options?.headers ?? {})
    },
    body: JSON.stringify({ step, data, targetStep })
  });
}

export async function skipOnboarding(companyId: string): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`${API_BASE}/onboarding/companies/${companyId}/skip`, { 
    method: "POST",
    headers: {
      ...(await buildApiHeaders()),
      "X-Parkflow-Auth-Toast-Silent": "1",
      "Idempotency-Key": crypto.randomUUID()
    }
  });
}

export async function completeOnboarding(companyId: string): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`${API_BASE}/onboarding/companies/${companyId}/complete`, { 
    method: "POST",
    headers: {
      ...(await buildApiHeaders()),
      "X-Parkflow-Auth-Toast-Silent": "1",
      "Idempotency-Key": crypto.randomUUID()
    }
  });
}

export async function resetOnboarding(companyId: string, reason: string = "Reinicio manual"): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`${API_BASE}/onboarding/companies/${companyId}/reset?reason=${encodeURIComponent(reason)}`, {
    method: "POST",
    headers: {
      ...(await buildApiHeaders()),
      "X-Parkflow-Auth-Toast-Silent": "1"
    }
  });
}
