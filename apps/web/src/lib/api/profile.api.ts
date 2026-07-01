import { authBase } from "@/lib/api/config";
import type { UserRole } from "@/lib/types/auth.types";
import { apiFetch } from "./_shared";

export { changePassword } from "./auth-api";

function authBaseUrl(): string {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    return "/api/v1/auth";
  }
  return authBase();
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
  return apiFetch<UserProfile>(`${authBaseUrl()}/profile`, { cache: "no-store" });
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  return apiFetch<UserProfile>(`${authBaseUrl()}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
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
  return apiFetch<DeviceInfo[]>(`${authBaseUrl()}/devices`, { cache: "no-store" });
}

export async function revokeDevice(deviceId: string, reason?: string): Promise<DeviceInfo> {
  return apiFetch<DeviceInfo>(`${authBaseUrl()}/devices/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, reason: reason ?? "Revocado por el usuario" })
  });
}
