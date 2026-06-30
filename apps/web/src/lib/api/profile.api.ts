import { authBase } from "@/lib/api/config";
import type { UserRole } from "@/lib/types/auth.types";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";

function authBaseUrl(): string {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    return "/api/v1/auth";
  }
  return authBase();
}

const statusMessages: Record<number, string> = {
  400: "Datos inválidos o incompletos. Por favor, revisa la información ingresada.",
  401: "Tu sesión ha expirado o credenciales incorrectas.",
  403: "No tienes permisos para realizar esta acción.",
  404: "El recurso solicitado no existe o fue eliminado.",
  409: "Conflicto con los datos actuales. Es posible que el registro ya exista o haya sido modificado.",
  500: "Ocurrió un error interno en el servidor.",
};

async function authFetch<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetchWithCredentials(`${authBaseUrl()}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {})
      }
    });
    if (!res.ok) {
      const rawText = await res.text();
      let body: Record<string, unknown> = {};
      try { body = rawText ? JSON.parse(rawText) as Record<string, unknown> : {}; } catch { /* ignore */ }
      const status = res.status;
      const userMsg = typeof body.userMessage === "string" ? body.userMessage
        : typeof body.message === "string" ? body.message
        : undefined;
      throw new Error(userMsg || statusMessages[status] || `No pudimos completar tu solicitud (${status}).`);
    }
    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Sin conexión. Verifica internet o la red local e intenta nuevamente.");
  }
}

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  document: string | null;
  phone: string | null;
  role: UserRole;
  site: string | null;
  terminal: string | null;
  active: boolean;
  canVoidTickets: boolean;
  canReprintTickets: boolean;
  canCloseCash: boolean;
  requirePasswordChange: boolean;
  lastAccessAt: string | null;
  passwordChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateProfilePayload = {
  name: string;
  email: string;
  document?: string | null;
  phone?: string | null;
  site?: string | null;
  terminal?: string | null;
};

export async function fetchProfile(): Promise<UserProfile> {
  return authFetch<UserProfile>("/profile", { cache: "no-store" });
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  return authFetch<UserProfile>("/profile", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetchWithCredentials(`${authBaseUrl()}/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const rawText = await res.text();
    let body: Record<string, unknown> = {};
    try { body = rawText ? JSON.parse(rawText) as Record<string, unknown> : {}; } catch { /* ignore */ }
    const status = res.status;
    const userMsg = typeof body.userMessage === "string" ? body.userMessage
      : typeof body.message === "string" ? body.message
      : undefined;
    throw new Error(userMsg || statusMessages[status] || `No pudimos completar tu solicitud (${status}).`);
  }
}

export interface DeviceInfo {
  id: string;
  deviceId: string;
  displayName: string;
  platform: string;
  authorized: boolean;
  revokedAt: string | null;
  lastSeenAt: string | null;
}

export async function fetchDevices(): Promise<DeviceInfo[]> {
  return authFetch<DeviceInfo[]>("/devices", { cache: "no-store" });
}

export async function revokeDevice(deviceId: string, reason?: string): Promise<DeviceInfo> {
  return authFetch<DeviceInfo>("/devices/revoke", {
    method: "POST",
    body: JSON.stringify({ deviceId, reason: reason ?? "Revocado por el usuario" })
  });
}
