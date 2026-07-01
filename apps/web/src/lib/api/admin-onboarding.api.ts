/**
 * Admin Onboarding Configuration API
 *
 * Manages onboarding question configuration for the admin panel.
 */
import { apiBase } from "@/lib/api/config";
import { apiFetch, buildApiHeaders } from "./_shared";

const API_BASE = apiBase();

export type OnboardingQuestionConfig = {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  enabled: boolean;
  required: boolean;
  planRestricted: boolean;
};

export async function fetchOnboardingQuestions(): Promise<OnboardingQuestionConfig[]> {
  return apiFetch<OnboardingQuestionConfig[]>(`${API_BASE}/admin/onboarding-questions`, {
    headers: await buildApiHeaders()
  });
}

export async function fetchEnabledOnboardingQuestions(): Promise<OnboardingQuestionConfig[]> {
  return apiFetch<OnboardingQuestionConfig[]>(`${API_BASE}/admin/onboarding-questions/enabled`, {
    headers: await buildApiHeaders()
  });
}

export async function saveOnboardingQuestion(dto: OnboardingQuestionConfig): Promise<OnboardingQuestionConfig> {
  return apiFetch<OnboardingQuestionConfig>(`${API_BASE}/admin/onboarding-questions`, {
    method: "POST",
    headers: {
      ...(await buildApiHeaders()),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(dto),
  });
}

export async function batchSaveOnboardingQuestions(dtos: OnboardingQuestionConfig[]): Promise<OnboardingQuestionConfig[]> {
  return apiFetch<OnboardingQuestionConfig[]>(`${API_BASE}/admin/onboarding-questions/batch`, {
    method: "PUT",
    headers: {
      ...(await buildApiHeaders()),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(dtos),
  });
}

export async function seedOnboardingQuestions(): Promise<void> {
  await apiFetch<void>(`${API_BASE}/admin/onboarding-questions/seed`, {
    method: "POST",
    headers: await buildApiHeaders()
  });
}

export async function deleteOnboardingQuestion(id: string): Promise<void> {
  await apiFetch<void>(`${API_BASE}/admin/onboarding-questions/${id}`, {
    method: "DELETE",
    headers: await buildApiHeaders()
  });
}
