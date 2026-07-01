import { authBase, apiBase } from "@/lib/api/config";
import { safeFetch } from "@/lib/api/fetch";

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
  return safeFetch<SetupRequiredResponse>(`${AUTH_BASE}/setup-required`);
}

export async function postInitialSetup(payload: SetupPayload): Promise<any> {
  return safeFetch<any>(`${AUTH_BASE}/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await safeFetch<void>(`${AUTH_BASE}/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, deviceId: "web" }),
  });
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  await safeFetch<void>(`${AUTH_BASE}/password-reset/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword, deviceId: "web" }),
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await safeFetch<void>(`${apiBase()}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
