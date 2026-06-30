import { authBase, apiBase } from "@/lib/api/config";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";

const AUTH_BASE = authBase();

export interface SetupRequiredResponse {
  setupRequired: boolean;
}

export interface SetupPayload {
  email: string;
  password: string;
  name: string;
  companyName: string;
  nit: string;
}

export async function checkSetupRequired(): Promise<SetupRequiredResponse> {
  const res = await fetchWithCredentials(`${AUTH_BASE}/setup-required`);
  if (!res.ok) throw new Error("No se pudo verificar el estado de configuración");
  return res.json();
}

export async function postInitialSetup(payload: SetupPayload): Promise<any> {
  const res = await fetchWithCredentials(`${AUTH_BASE}/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("No se pudo registrar el usuario inicial");
  return res.json();
}

export async function requestPasswordReset(email: string): Promise<void> {
  const res = await fetchWithCredentials(`${AUTH_BASE}/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, deviceId: "web" }),
  });
  if (res.status === 429) throw new Error("Demasiados intentos. Por favor espere antes de solicitar un nuevo código.");
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  const res = await fetchWithCredentials(`${AUTH_BASE}/password-reset/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword, deviceId: "web" }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(data.message || "Token inválido o expirado");
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetchWithCredentials(`${apiBase()}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let detail = "Error al cambiar la contraseña";
    if (res.status === 400) detail = "La contraseña actual no es correcta o la nueva no cumple los requisitos";
    else if (res.status === 401) detail = "Sesión expirada. Inicia sesión nuevamente.";
    else if (body) detail = body;
    throw new Error(detail);
  }
}
