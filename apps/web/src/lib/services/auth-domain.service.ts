import type { AuthUser, Permission } from "@parkflow/types";
import { loadSession, saveSession } from "./auth-storage.service";
import { useAuthStore } from "@/lib/stores/auth.store";

export async function authHeaders(options?: { auditReason?: string; offline?: boolean }): Promise<HeadersInit> {
  const auditReason = options?.auditReason?.trim();
  const auditValue = auditReason && auditReason.length > 0
    ? auditReason.length > 500 ? auditReason.slice(0, 500) : auditReason
    : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
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
  const { user: storeUser } = useAuthStore.getState();
  if (storeUser) return storeUser as AuthUser;
  const session = await loadSession();
  return session?.user ?? null;
}

export async function patchSessionUser(patch: Partial<AuthUser>): Promise<void> {
  const session = await loadSession();
  if (!session) return;
  const nextSession = {
    ...session,
    user: { ...session.user, ...patch }
  };
  await saveSession(nextSession);
  useAuthStore.getState().setUser(nextSession.user);
}

export function canAccessSuperAdminPortal(user: AuthUser | null): boolean {
  return user?.role === "SUPER_ADMIN";
}
