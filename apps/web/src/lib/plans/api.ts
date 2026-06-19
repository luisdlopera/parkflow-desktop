import { authHeaders } from "@/features/auth/services/auth-domain.service";
import { normalizeApiError, handleNetworkError } from "@/lib/errors/normalize-api-error";
import { apiBase as getApiBase } from "@/lib/api/config";
import type { Plan, CreatePlanRequest } from "./types";

const API_BASE = getApiBase();

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = await authHeaders();

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw await normalizeApiError(response);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "ApiError") {
      throw error;
    }
    throw handleNetworkError(error);
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
