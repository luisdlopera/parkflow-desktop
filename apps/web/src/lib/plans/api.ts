import { apiFetch, apiV1Base } from "@/lib/api/_shared";
import type { Plan, CreatePlanRequest } from "./types";
const API_BASE = apiV1Base();

export async function listPlans(
  includeDeleted?: boolean,
  active?: boolean
): Promise<Plan[]> {
  const params = new URLSearchParams();
  if (includeDeleted) params.set("includeDeleted", "true");
  if (active !== undefined) params.set("active", String(active));
  const qs = params.toString();
  return apiFetch<Plan[]>(`${API_BASE}/admin/plans${qs ? `?${qs}` : ""}`);
}

export async function getPlan(id: string): Promise<Plan> {
  return apiFetch<Plan>(`${API_BASE}/admin/plans/${id}`);
}

export async function createPlan(request: CreatePlanRequest): Promise<Plan> {
  return apiFetch<Plan>(`${API_BASE}/admin/plans`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function updatePlan(
  id: string,
  request: CreatePlanRequest
): Promise<Plan> {
  return apiFetch<Plan>(`${API_BASE}/admin/plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
}

export async function deletePlan(id: string): Promise<void> {
  return apiFetch<void>(`${API_BASE}/admin/plans/${id}`, {
    method: "DELETE",
  });
}

export async function togglePlan(id: string): Promise<Plan> {
  return apiFetch<Plan>(`${API_BASE}/admin/plans/${id}/toggle`, {
    method: "PATCH",
  });
}

export async function duplicatePlan(id: string): Promise<Plan> {
  return apiFetch<Plan>(`${API_BASE}/admin/plans/${id}/duplicate`, {
    method: "POST",
  });
}
