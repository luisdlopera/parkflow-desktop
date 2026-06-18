import { buildApiHeaders, type AuthHeaderOptions } from "../api";
import { normalizeApiError, handleNetworkError } from "@/lib/errors/normalize-api-error";

export type { AuthHeaderOptions };
export { buildApiHeaders };

export function hdr(auditReason?: string): AuthHeaderOptions | undefined {
  const t = auditReason?.trim();
  return t ? { auditReason: t } : undefined;
}

export type SettingsPage<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

export function apiV1Base(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:6011/api/v1/operations";
  return raw.replace(/\/?operations\/?$/i, "");
}

export function cfgBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:6011/api/v1/operations";
  return raw.replace(/\/?operations\/?$/i, "/configuration");
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw await normalizeApiError(res);
    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "ApiError") throw error;
    throw handleNetworkError(error);
  }
}
