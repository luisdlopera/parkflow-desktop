import { authHeaders } from "@/features/auth/services/auth-domain.service";
import { authBase, apiBase } from "@/lib/api/config";
import { API_CONFIG } from "@/lib/api/config";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";


const AUTH_BASE = authBase();
const API_KEY = API_CONFIG.apiKey;

const apiKeyHeader = { "Content-Type": "application/json", "X-API-Key": API_KEY };

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

export async function postInitialSetup(payload: SetupPayload): Promise<unknown> {
  const res = await fetchWithCredentials(`${AUTH_BASE}/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("No se pudo registrar la configuración inicial");
  return res.json();
}

export async function requestPasswordReset(email: string): Promise<void> {
  const res = await fetchWithCredentials(`${AUTH_BASE}/password-reset/request`, {
    method: "POST",
    headers: apiKeyHeader,
    body: JSON.stringify({ email, deviceId: "web" }),
  });
  if (res.status === 429) throw new Error("Demasiados intentos. Por favor espere antes de solicitar un nuevo código.");
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  const res = await fetchWithCredentials(`${AUTH_BASE}/password-reset/confirm`, {
    method: "POST",
    headers: apiKeyHeader,
    body: JSON.stringify({ token, newPassword, deviceId: "web" }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).message || "Token inválido o expirado");
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetchWithCredentials(`${apiBase()}/auth/change-password`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
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
