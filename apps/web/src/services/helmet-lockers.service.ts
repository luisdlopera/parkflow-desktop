import { buildApiHeaders } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6011/api/v1";

export type HelmetLockerDto = {
  id: string;
  code: string;
  label: string | null;
  isActive: boolean;
  occupied: boolean;
};

export async function fetchHelmetLockers(): Promise<HelmetLockerDto[]> {
  const res = await fetch(`${API_BASE}/helmet-lockers`, {
    headers: await buildApiHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error ?? "No se pudieron cargar las fichas");
  }
  return res.json();
}

export async function fetchAvailableHelmetLockers(): Promise<HelmetLockerDto[]> {
  const res = await fetch(`${API_BASE}/helmet-lockers/available`, {
    headers: await buildApiHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error ?? "No se pudieron cargar las fichas disponibles");
  }
  return res.json();
}

export async function createHelmetLocker(code: string, label?: string): Promise<HelmetLockerDto> {
  const res = await fetch(`${API_BASE}/helmet-lockers`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify({ code, label }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error ?? "Error al crear la ficha");
  }
  return res.json();
}

export async function createBatchHelmetLockers(prefix: string, start: number, end: number): Promise<HelmetLockerDto[]> {
  const res = await fetch(`${API_BASE}/helmet-lockers/batch`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify({ prefix, start, end }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error ?? "Error al crear fichas en lote");
  }
  return res.json();
}

export async function patchHelmetLocker(id: string, data: { code?: string; label?: string; isActive?: boolean }): Promise<HelmetLockerDto> {
  const res = await fetch(`${API_BASE}/helmet-lockers/${id}`, {
    method: "PATCH",
    headers: await buildApiHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error ?? "Error al actualizar la ficha");
  }
  return res.json();
}

export async function deleteHelmetLocker(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/helmet-lockers/${id}`, {
    method: "DELETE",
    headers: await buildApiHeaders(),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error ?? "Error al eliminar la ficha");
  }
}
