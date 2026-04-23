"use client";

import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  OfflineLease,
  Permission,
  SessionInfo
} from "@parkflow/types";

const STORAGE_KEY = "parkflow.auth.session";

type StoredSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  session: SessionInfo;
  offlineLease: OfflineLease | null;
};

let memorySession: StoredSession | null = null;

function authBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? "http://localhost:8080/api/v1/auth";
  return raw.replace(/\/$/, "");
}

function operationsApiKey(): string {
  return process.env.NEXT_PUBLIC_API_KEY ?? "parkflow-dev-key";
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

export async function login(request: LoginRequest): Promise<StoredSession> {
  const response = await fetch(`${authBaseUrl()}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": operationsApiKey()
    },
    body: JSON.stringify(request)
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
    body: JSON.stringify({
      refreshToken: current.refreshToken,
      deviceId: current.session.deviceId
    })
  });

  if (!response.ok) {
    await clearSession();
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

export async function authHeaders(): Promise<HeadersInit> {
  const session = await loadSession();
  if (!session) {
    return {
      "Content-Type": "application/json",
      "X-API-Key": operationsApiKey()
    };
  }

  const refreshed = await refreshIfNeeded(session);
  return {
    "Content-Type": "application/json",
    "X-API-Key": operationsApiKey(),
    Authorization: `Bearer ${refreshed.accessToken}`
  };
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
