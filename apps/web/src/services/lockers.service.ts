import { buildApiHeaders } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6011/api/v1";

export type LockerDto = {
  id: string;
  code: string;
  label: string | null;
  status: "DISPONIBLE" | "OCUPADO" | "FUERA_DE_SERVICIO";
  isActive: boolean;
  occupied: boolean;
};

export async function fetchLockers(): Promise<LockerDto[]> {
  const res = await fetch(`${API_BASE}/lockers`, {
    headers: await buildApiHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.userMessage ?? payload?.error ?? "No se pudieron cargar los lockers");
  }
  return res.json();
}

export async function fetchAvailableLockers(): Promise<LockerDto[]> {
  const res = await fetch(`${API_BASE}/lockers/available`, {
    headers: await buildApiHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.userMessage ?? payload?.error ?? "No se pudieron cargar los lockers disponibles");
  }
  return res.json();
}

export async function createLocker(code: string, label?: string): Promise<LockerDto> {
  const res = await fetch(`${API_BASE}/lockers`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify({ code, label }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.userMessage ?? payload?.error ?? "Error al crear el locker");
  }
  return res.json();
}

export async function createBatchLockers(
  prefix: string,
  start: number,
  end: number,
): Promise<LockerDto[]> {
  const res = await fetch(`${API_BASE}/lockers/batch`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify({ prefix, start, end }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.userMessage ?? payload?.error ?? "Error al crear lockers en lote");
  }
  return res.json();
}

export async function patchLocker(
  id: string,
  data: { code?: string; label?: string; isActive?: boolean; status?: string },
): Promise<LockerDto> {
  const res = await fetch(`${API_BASE}/lockers/${id}`, {
    method: "PATCH",
    headers: await buildApiHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.userMessage ?? payload?.error ?? "Error al actualizar el locker");
  }
  return res.json();
}

export async function deleteLocker(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/lockers/${id}`, {
    method: "DELETE",
    headers: await buildApiHeaders(),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.userMessage ?? payload?.error ?? "Error al eliminar el locker");
  }
}
