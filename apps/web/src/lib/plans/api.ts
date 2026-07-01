import { authHeaders } from "@/lib/services/auth-domain.service";
import { apiBase as getApiBase } from "@/lib/api/config";
import type { Plan, CreatePlanRequest } from "./types";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";


const API_BASE = getApiBase();

const statusMessages: Record<number, string> = {
  400: "Datos inválidos o incompletos. Por favor, revisa la información ingresada.",
  401: "Tu sesión ha expirado o credenciales incorrectas.",
  403: "No tienes permisos para realizar esta acción.",
  404: "El recurso solicitado no existe o fue eliminado.",
  409: "Conflicto con los datos actuales. Es posible que el registro ya exista o haya sido modificado.",
  500: "Ocurrió un error interno en el servidor.",
};

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = await authHeaders();

  try {
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
      const msg = userMsg || statusMessages[status] || `No pudimos completar tu solicitud (${status}).`;
      throw new Error(msg);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Sin conexión. Verifica internet o la red local e intenta nuevamente.", { cause: error });
  }
}

export async function listPlans(
  includeDeleted?: boolean,
  active?: boolean
): Promise<Plan[]> {
  const params = new URLSearchParams();
  if (includeDeleted) params.set("includeDeleted", "true");
  if (active !== undefined) params.set("active", String(active));
  const qs = params.toString();
  return apiFetch<Plan[]>(`/admin/plans${qs ? `?${qs}` : ""}`);
}

export async function getPlan(id: string): Promise<Plan> {
  return apiFetch<Plan>(`/admin/plans/${id}`);
}

export async function createPlan(request: CreatePlanRequest): Promise<Plan> {
  return apiFetch<Plan>("/admin/plans", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function updatePlan(
  id: string,
  request: CreatePlanRequest
): Promise<Plan> {
  return apiFetch<Plan>(`/admin/plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
}

export async function deletePlan(id: string): Promise<void> {
  return apiFetch<void>(`/admin/plans/${id}`, {
    method: "DELETE",
  });
}

export async function togglePlan(id: string): Promise<Plan> {
  return apiFetch<Plan>(`/admin/plans/${id}/toggle`, {
    method: "PATCH",
  });
}

export async function duplicatePlan(id: string): Promise<Plan> {
  return apiFetch<Plan>(`/admin/plans/${id}/duplicate`, {
    method: "POST",
  });
}
