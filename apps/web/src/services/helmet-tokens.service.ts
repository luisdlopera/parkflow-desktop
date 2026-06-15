import { buildApiHeaders } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6011/api/v1";

export type HelmetTokenDto = {
  id: string;
  code: string;
  label: string | null;
  isActive: boolean;
  occupied: boolean;
};

export async function fetchHelmetTokens(): Promise<HelmetTokenDto[]> {
  const res = await fetch(`${API_BASE}/helmet-tokens`, {
    headers: await buildApiHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.userMessage ?? payload?.error ?? "No se pudieron cargar las fichas");
  }
  return res.json();
}

export async function fetchAvailableHelmetTokens(): Promise<HelmetTokenDto[]> {
  const res = await fetch(`${API_BASE}/helmet-tokens/available`, {
    headers: await buildApiHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.userMessage ?? payload?.error ?? "No se pudieron cargar las fichas disponibles");
  }
  return res.json();
}

export async function createHelmetToken(code: string, label?: string): Promise<HelmetTokenDto> {
  const res = await fetch(`${API_BASE}/helmet-tokens`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify({ code, label }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.userMessage ?? payload?.error ?? "Error al crear la ficha");
  }
  return res.json();
}

export async function createBatchHelmetTokens(
  prefix: string,
  start: number,
  end: number,
): Promise<HelmetTokenDto[]> {
  const res = await fetch(`${API_BASE}/helmet-tokens/batch`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify({ prefix, start, end }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.userMessage ?? payload?.error ?? "Error al crear fichas en lote");
  }
  return res.json();
}

export async function patchHelmetToken(
  id: string,
  data: { code?: string; label?: string; isActive?: boolean },
): Promise<HelmetTokenDto> {
  const res = await fetch(`${API_BASE}/helmet-tokens/${id}`, {
    method: "PATCH",
    headers: await buildApiHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.userMessage ?? payload?.error ?? "Error al actualizar la ficha");
  }
  return res.json();
}

export async function deleteHelmetToken(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/helmet-tokens/${id}`, {
    method: "DELETE",
    headers: await buildApiHeaders(),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.userMessage ?? payload?.error ?? "Error al eliminar la ficha");
  }
}
