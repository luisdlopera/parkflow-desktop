import { buildApiHeaders } from "@/lib/api";
import { apiBase } from "@/lib/api/config";
import { apiFetch } from "./_shared";


const API_BASE = apiBase();

export type LockerDto = {
  id: string;
  code: string;
  label: string | null;
  status: "DISPONIBLE" | "OCUPADO" | "FUERA_DE_SERVICIO";
  isActive: boolean;
  occupied: boolean;
};

export async function fetchLockers(): Promise<LockerDto[]> {
  return apiFetch<LockerDto[]>(`${API_BASE}/lockers`, {
    headers: await buildApiHeaders(),
    cache: "no-store",
  });
}

export async function fetchAvailableLockers(): Promise<LockerDto[]> {
  return apiFetch<LockerDto[]>(`${API_BASE}/lockers/available`, {
    headers: await buildApiHeaders(),
    cache: "no-store",
  });
}

export async function createLocker(code: string, label?: string): Promise<LockerDto> {
  return apiFetch<LockerDto>(`${API_BASE}/lockers`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify({ code, label }),
  });
}

export async function createBatchLockers(
  prefix: string,
  start: number,
  end: number,
): Promise<LockerDto[]> {
  return apiFetch<LockerDto[]>(`${API_BASE}/lockers/batch`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify({ prefix, start, end }),
  });
}

export async function patchLocker(
  id: string,
  data: { code?: string; label?: string; isActive?: boolean; status?: string },
): Promise<LockerDto> {
  return apiFetch<LockerDto>(`${API_BASE}/lockers/${id}`, {
    method: "PATCH",
    headers: await buildApiHeaders(),
    body: JSON.stringify(data),
  });
}

export async function deleteLocker(id: string): Promise<void> {
  await apiFetch<void>(`${API_BASE}/lockers/${id}`, {
    method: "DELETE",
    headers: await buildApiHeaders(),
  });
}
