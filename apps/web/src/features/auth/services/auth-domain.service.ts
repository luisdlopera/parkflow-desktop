import type { AuthUser, Permission } from "@parkflow/types";
import { loadSession, saveSession } from "./auth-storage.service";
import { refreshIfNeeded, authHeadersApiKey } from "../api/auth.api";
import type { AuthHeaderOptions } from "../types";
import { safeStorage } from "@/lib/utils/storage";


export async function authHeaders(options?: AuthHeaderOptions): Promise<HeadersInit> {
  const session = await loadSession();
  const terminalHeader = typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_TERMINAL_ID?.trim() || safeStorage.getItem("parkflow_terminal_id")?.trim()
    : undefined;
  
  const auditReason = options?.auditReason?.trim();
  const auditValue = auditReason && auditReason.length > 0
    ? auditReason.length > 500 ? auditReason.slice(0, 500) : auditReason
    : null;

  if (!session) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": authHeadersApiKey()
    };
    if (terminalHeader) headers["X-Parkflow-Terminal"] = terminalHeader;
    if (auditValue) headers["X-Parkflow-Audit-Reason"] = auditValue;
    if (options?.offline === true) headers["X-Parkflow-Offline"] = "1";
    return headers;
  }

  const refreshed = await refreshIfNeeded(session);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": authHeadersApiKey()
  };
  if (terminalHeader) headers["X-Parkflow-Terminal"] = terminalHeader;
  if (auditValue) headers["X-Parkflow-Audit-Reason"] = auditValue;
  if (options?.offline === true) headers["X-Parkflow-Offline"] = "1";
  return headers;
}

export async function hasPermission(permission: Permission): Promise<boolean> {
  const session = await loadSession();
  return session ? session.user.permissions.includes(permission) : false;
}

export async function isOfflineLeaseValid(): Promise<boolean> {
  const session = await loadSession();
  return session?.offlineLease ? Date.now() < Date.parse(session.offlineLease.expiresAtIso) : false;
}

export async function currentUser(): Promise<AuthUser | null> {
  const session = await loadSession();
  if (!session) return null;
  return session.user ?? null;
}

export async function patchSessionUser(patch: Partial<AuthUser>): Promise<void> {
  const session = await loadSession();
  if (!session) return;
  await saveSession({
    ...session,
    user: { ...session.user, ...patch }
  });
}

export function canAccessSuperAdminPortal(user: AuthUser | null): boolean {
  return user?.role === "SUPER_ADMIN";
}
