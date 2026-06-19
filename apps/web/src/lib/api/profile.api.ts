import { authHeaders } from "@/features/auth/services/auth-domain.service";
import { normalizeApiError, handleNetworkError } from "@/lib/errors/normalize-api-error";
import { authBase } from "@/lib/api/config";
import type { UserRole } from "@/modules/settings/types";

function authBaseUrl(): string {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    return "/api/v1/auth";
  }
  return authBase();
}

async function authFetch<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${authBaseUrl()}${path}`, {
      ...options,
      headers: {
        ...(await authHeaders()),
        ...(options?.headers ?? {})
      }
    });
    if (!res.ok) throw await normalizeApiError(res);
    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "ApiError") throw error;
    throw handleNetworkError(error);
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
  const res = await fetch(`${authBaseUrl()}/change-password`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) throw await normalizeApiError(res);
}
