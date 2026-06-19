import { buildApiHeaders, type AuthHeaderOptions } from "../api";
import { apiBase, cfgBase as cfgBaseUrl } from "./config";
import safeFetch from "./fetch";

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
  return apiBase();
}

export function cfgBase(): string {
  return cfgBaseUrl();
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  return safeFetch<T>(url, options);
}
