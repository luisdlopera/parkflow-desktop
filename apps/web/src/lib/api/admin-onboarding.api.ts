/**
 * Admin Onboarding Configuration API
 *
 * Manages onboarding question configuration for the admin panel.
 *
 * ⚠️ DEPRECATION: Import directly from this file, not via the barrel re-export `/lib/admin-onboarding-api.ts`.
 *    For new code, prefer:
 *    import { fetchOnboardingQuestions } from "@/lib/api/admin-onboarding.api"
 */
import { authHeaders } from "@/lib/services/auth-domain.service";
import { apiBase } from "@/lib/api/config";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";


const API_BASE = apiBase();

const statusMessages: Record<number, string> = {
  400: "Datos inválidos o incompletos.",
  401: "Tu sesión ha expirado o credenciales incorrectas.",
  403: "No tienes permisos para realizar esta acción.",
  404: "El recurso solicitado no existe o fue eliminado.",
  409: "Conflicto con los datos actuales.",
  500: "Ocurrió un error interno en el servidor.",
};

export type OnboardingQuestionConfig = {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  enabled: boolean;
  required: boolean;
  planRestricted: boolean;
};

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const response = await fetchWithCredentials(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const rawText = await response.text();
    let body: Record<string, unknown> = {};
    try { body = rawText ? JSON.parse(rawText) as Record<string, unknown> : {}; } catch { /* ignore */ }
    const status = response.status;
    const userMsg = typeof body.userMessage === "string" ? body.userMessage
      : typeof body.message === "string" ? body.message
      : undefined;
    throw new Error(userMsg || statusMessages[status] || `No pudimos completar tu solicitud (${status}).`);
  }
  return (await response.json()) as T;
}

export async function fetchOnboardingQuestions(): Promise<OnboardingQuestionConfig[]> {
  return apiFetch<OnboardingQuestionConfig[]>("/admin/onboarding-questions");
}

export async function fetchEnabledOnboardingQuestions(): Promise<OnboardingQuestionConfig[]> {
  return apiFetch<OnboardingQuestionConfig[]>("/admin/onboarding-questions/enabled");
}

export async function saveOnboardingQuestion(dto: OnboardingQuestionConfig): Promise<OnboardingQuestionConfig> {
  return apiFetch<OnboardingQuestionConfig>("/admin/onboarding-questions", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function batchSaveOnboardingQuestions(dtos: OnboardingQuestionConfig[]): Promise<OnboardingQuestionConfig[]> {
  return apiFetch<OnboardingQuestionConfig[]>("/admin/onboarding-questions/batch", {
    method: "PUT",
    body: JSON.stringify(dtos),
  });
}

export async function seedOnboardingQuestions(): Promise<void> {
  await apiFetch<void>("/admin/onboarding-questions/seed", { method: "POST" });
}

export async function deleteOnboardingQuestion(id: string): Promise<void> {
  await apiFetch<void>(`/admin/onboarding-questions/${id}`, { method: "DELETE" });
}
