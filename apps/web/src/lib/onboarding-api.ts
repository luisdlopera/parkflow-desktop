import { authHeaders } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6011/api/v1";

export type OnboardingStatus = {
  companyId: string;
  plan: "LOCAL" | "SYNC" | "PRO" | "ENTERPRISE";
  onboardingCompleted: boolean;
  currentStep: number;
  skipped: boolean;
  progressData: Record<string, unknown>;
  availableOptionsByPlan: Record<string, unknown>;
};

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers
    }
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchOnboardingStatus(companyId: string): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`/onboarding/companies/${companyId}`);
}

export async function saveOnboardingStep(companyId: string, step: number, data: Record<string, unknown>): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`/onboarding/companies/${companyId}/steps`, {
    method: "PUT",
    body: JSON.stringify({ step, data })
  });
}

export async function skipOnboarding(companyId: string): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`/onboarding/companies/${companyId}/skip`, { method: "POST" });
}

export async function completeOnboarding(companyId: string): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`/onboarding/companies/${companyId}/complete`, { method: "POST" });
}
