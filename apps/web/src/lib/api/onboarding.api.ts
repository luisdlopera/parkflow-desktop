/**
 * Onboarding Status & Progress API
 *
 * Manages company onboarding workflow and progress tracking.
 *
 * ⚠️ DEPRECATION: Import directly from this file, not via the barrel re-export `/lib/onboarding-api.ts`.
 *    For new code, prefer:
 *    import { fetchOnboardingStatus } from "@/lib/api/onboarding.api"
 */
/* global RequestInit */
import { authHeaders } from "@/lib/services/auth-domain.service";
import { apiBase } from "@/lib/api/config";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";
import { ApiError } from "@/lib/errors/ApiError";


const API_BASE = apiBase();

const statusMessages: Record<number, string> = {
  400: "Datos inválidos o incompletos.",
  401: "Tu sesión ha expirado o credenciales incorrectas.",
  403: "No tienes permisos para realizar esta acción.",
  404: "El recurso solicitado no existe o fue eliminado.",
  409: "Conflicto con los datos actuales.",
  500: "Ocurrió un error interno en el servidor.",
};

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
    const rawText = await response.text();
    let body: Record<string, unknown> = {};
    try { body = rawText ? JSON.parse(rawText) as Record<string, unknown> : {}; } catch { /* ignore */ }
    const status = response.status;
    const userMsg = typeof body.userMessage === "string" ? body.userMessage
      : typeof body.message === "string" ? body.message
      : undefined;
      
    throw new ApiError(userMsg || statusMessages[status] || `No pudimos completar tu solicitud (${status}).`, {
      status: response.status,
      code: String(body.errorCode || body.code || ""),
      correlationId: String(body.correlationId || ""),
      details: body.details as Record<string, unknown> | undefined,
      payload: body
    });
  }
  return (await response.json()) as T;
}

export async function fetchOnboardingStatus(companyId: string): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`/onboarding/companies/${companyId}`);
}

export async function saveOnboardingStep(
  companyId: string, 
  step: number, 
  data: Record<string, unknown>, 
  targetStep?: number,
  options?: RequestInit
): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`/onboarding/companies/${companyId}/steps`, {
    ...options,
    method: "PUT",
    body: JSON.stringify({ step, data, targetStep })
  });
}

export async function skipOnboarding(companyId: string): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`/onboarding/companies/${companyId}/skip`, { 
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() }
  });
}

export async function completeOnboarding(companyId: string): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`/onboarding/companies/${companyId}/complete`, { 
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() }
  });
}

export async function resetOnboarding(companyId: string, reason: string = "Reinicio manual"): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>(`/onboarding/companies/${companyId}/reset?reason=${encodeURIComponent(reason)}`, { method: "POST" });
}
