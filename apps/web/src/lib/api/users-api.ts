import { apiFetch, apiV1Base, buildApiHeaders, hdr, type SettingsPage } from "./_shared";
import {
  settingsPasswordResetSchema,
  settingsUserCreateSchema,
  settingsUserPatchSchema,
  settingsUserStatusSchema,
} from "@/lib/validation/contracts";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";
import type { UserRole } from "@/lib/types/auth.types";

export type UserAdminRow = {
  id: string;
  name: string;
  email: string;
  document: string | null;
  phone: string | null;
  role: UserRole;
  site: string | null;
  terminal: string | null;
  active: boolean;
  lastAccessAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchUserById(id: string): Promise<UserAdminRow> {
  return apiFetch<UserAdminRow>(`${apiV1Base()}/settings/users/${id}`, {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}

export async function fetchUsers(params: {
  q?: string;
  active?: boolean | null;
  page?: number;
  size?: number;
}): Promise<SettingsPage<UserAdminRow>> {
  const u = new URL(`${apiV1Base()}/settings/users`);
  if (params.q) u.searchParams.set("q", params.q);
  if (params.active !== undefined && params.active !== null)
    u.searchParams.set("active", String(params.active));
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<SettingsPage<UserAdminRow>>(u.toString(), {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}

export async function createUser(
  payload: Record<string, unknown>,
  auditReason?: string,
): Promise<UserAdminRow> {
  const validatedBody = validatePayloadOrThrow(settingsUserCreateSchema, payload);
  return apiFetch<UserAdminRow>(`${apiV1Base()}/settings/users`, {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}

export async function patchUser(
  id: string,
  payload: Record<string, unknown>,
  auditReason?: string,
): Promise<UserAdminRow> {
  const validatedBody = validatePayloadOrThrow(settingsUserPatchSchema, payload);
  return apiFetch<UserAdminRow>(`${apiV1Base()}/settings/users/${id}`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}

export async function patchUserStatus(
  id: string,
  active: boolean,
  auditReason?: string,
): Promise<UserAdminRow> {
  const validatedBody = validatePayloadOrThrow(settingsUserStatusSchema, { active });
  return apiFetch<UserAdminRow>(`${apiV1Base()}/settings/users/${id}/status`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}

export async function resetUserPassword(
  id: string,
  newPassword: string,
  auditReason?: string,
): Promise<void> {
  const validatedBody = validatePayloadOrThrow(settingsPasswordResetSchema, { newPassword });
  return apiFetch<void>(`${apiV1Base()}/settings/users/${id}/reset-password`, {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}
