"use client";

import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  OfflineLease,
  Permission,
  SessionInfo
} from "@parkflow/types";
import { authLoginRequestSchema, authRefreshRequestSchema } from "@/lib/validation/contracts";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";

const STORAGE_KEY = "parkflow.auth.session";

type StoredSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  session: SessionInfo;
  offlineLease: OfflineLease | null;
};

let memorySession: StoredSession | null = null;
let redirectInProgress = false;

export type AuthHeaderOptions = {
  /** Optional note stored in server audit metadata for sensitive settings changes. */
  auditReason?: string;
  /** Indica operacion en modo offline (p. ej. tope de movimientos de caja en servidor). */
  offline?: boolean;
};

function authBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? "http://localhost:6011/api/v1/auth";
  return raw.replace(/\/$/, "");
}

function operationsApiKey(): string {
  const key = process.env.NEXT_PUBLIC_API_KEY;
  if (!key || key.trim().length === 0) {
    // SECURITY: Throw in production, allow empty only in clear dev mode
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_API_KEY is required in production");
    }
    // Development fallback - should never reach production builds
    console.warn("[SECURITY] NEXT_PUBLIC_API_KEY not set - using insecure dev fallback");
    return "dev-key-change-immediately";
  }
  return key.trim();
}

async function tauriInvoke<T>(cmd: string, payload?: unknown): Promise<T | null> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return null;
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<T>(cmd, payload as Record<string, unknown> | undefined);
  } catch {
    return null;
  }
}

function readBrowserStorage(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function writeBrowserStorage(session: StoredSession | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<StoredSession | null> {
  if (memorySession) {
    return memorySession;
  }

  const tauri = await tauriInvoke<StoredSession>("auth_load_session");
  if (tauri) {
    memorySession = tauri;
    return tauri;
  }

  const browser = readBrowserStorage();
  memorySession = browser;
  return browser;
}

export async function saveSession(session: StoredSession): Promise<void> {
  memorySession = session;
  await tauriInvoke<void>("auth_store_session", { payloadJson: JSON.stringify(session) });
  writeBrowserStorage(session);
}

export async function clearSession(): Promise<void> {
  memorySession = null;
  await tauriInvoke<void>("auth_clear_session");
  writeBrowserStorage(null);
}

export async function logoutAndRedirectToLogin(reason = "expired"): Promise<void> {
  await clearSession();
  if (typeof window === "undefined") {
    return;
  }
  if (redirectInProgress) {
    return;
  }
  redirectInProgress = true;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`/login?reason=${encodeURIComponent(reason)}&next=${next}`);
}

export async function login(request: LoginRequest): Promise<StoredSession> {
  const validatedRequest = validatePayloadOrThrow(authLoginRequestSchema, request);
  const response = await fetch(`${authBaseUrl()}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": operationsApiKey()
    },
    body: JSON.stringify(validatedRequest)
  });

  const payload = (await response.json()) as LoginResponse;
  if (!response.ok) {
    throw new Error("Credenciales invalidas o equipo no autorizado");
  }

  const session: StoredSession = {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    user: payload.user,
    session: payload.session,
    offlineLease: payload.offlineLease
  };
  await saveSession(session);
  return session;
}

export async function refreshIfNeeded(current: StoredSession): Promise<StoredSession> {
  const exp = Date.parse(current.session.accessTokenExpiresAtIso);
  const thresholdMs = 60_000;
  if (!Number.isFinite(exp) || exp - Date.now() > thresholdMs) {
    return current;
  }

  const response = await fetch(`${authBaseUrl()}/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": operationsApiKey()
    },
    body: JSON.stringify(validatePayloadOrThrow(authRefreshRequestSchema, {
      refreshToken: current.refreshToken,
      deviceId: current.session.deviceId
    }))
  });

  if (!response.ok) {
    await logoutAndRedirectToLogin("expired");
    throw new Error("No se pudo refrescar la sesion");
  }

  const payload = (await response.json()) as LoginResponse;
  const rotated: StoredSession = {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    user: payload.user,
    session: payload.session,
    offlineLease: payload.offlineLease
  };
  await saveSession(rotated);
  return rotated;
}

export async function authHeaders(options?: AuthHeaderOptions): Promise<HeadersInit> {
  const session = await loadSession();
  const terminalHeader =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_TERMINAL_ID?.trim() ||
        window.localStorage.getItem("parkflow_terminal_id")?.trim()
      : undefined;
  const auditReason = options?.auditReason?.trim();
  const auditValue =
    auditReason && auditReason.length > 0
      ? auditReason.length > 500
        ? auditReason.slice(0, 500)
        : auditReason
      : null;

  if (!session) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": operationsApiKey()
    };
    if (terminalHeader) {
      headers["X-Parkflow-Terminal"] = terminalHeader;
    }
    if (auditValue) {
      headers["X-Parkflow-Audit-Reason"] = auditValue;
    }
    if (options?.offline === true) {
      headers["X-Parkflow-Offline"] = "1";
    }
    return headers;
  }

  const refreshed = await refreshIfNeeded(session);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": operationsApiKey(),
    Authorization: `Bearer ${refreshed.accessToken}`
  };
  if (terminalHeader) {
    headers["X-Parkflow-Terminal"] = terminalHeader;
  }
  if (auditValue) {
    headers["X-Parkflow-Audit-Reason"] = auditValue;
  }
  if (options?.offline === true) {
    headers["X-Parkflow-Offline"] = "1";
  }
  return headers;
}

export async function hasPermission(permission: Permission): Promise<boolean> {
  const session = await loadSession();
  if (!session) {
    return false;
  }
  return session.user.permissions.includes(permission);
}

export async function isOfflineLeaseValid(): Promise<boolean> {
  const session = await loadSession();
  if (!session?.offlineLease) {
    return false;
  }
  return Date.now() < Date.parse(session.offlineLease.expiresAtIso);
}

export async function currentUser(): Promise<AuthUser | null> {
  const session = await loadSession();
  return session?.user ?? null;
}

/** Licensing / SaaS administration UI at `/admin/*` (SUPER_ADMIN only). */
export function canAccessSuperAdminPortal(user: AuthUser | null): boolean {
  return user?.role === "SUPER_ADMIN";
}

export async function handleAuthFailureStatus(status: number): Promise<void> {
  if (status === 401) {
    await logoutAndRedirectToLogin("expired");
    return;
  }
  if (status === 403 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("parkflow:forbidden"));
  }
}
