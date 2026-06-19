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
import { authBase } from "@/lib/api/config";

const STORAGE_KEY = "parkflow.auth.session";

export type StoredSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  session: SessionInfo;
  offlineLease: OfflineLease | null;
};

export type AuthHeaderOptions = {
  auditReason?: string;
  offline?: boolean;
};

function authBaseUrl(): string {
  return authBase();
}

function operationsApiKey(): string {
  const key = process.env.NEXT_PUBLIC_API_KEY;
  if (!key || key.trim().length === 0) return "";
  return key.trim();
}

async function tauriInvoke<T>(cmd: string, payload?: unknown): Promise<T | null> {
  const tauriInternals = typeof window !== "undefined" ? (window as any).__TAURI_INTERNALS__ : undefined;
  if (typeof tauriInternals?.invoke !== "function") return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<T>(cmd, payload as Record<string, unknown> | undefined);
  } catch {
    return null;
  }
}

class AuthService {
  private memorySession: StoredSession | null = null;
  private redirectInProgress = false;
  private refreshPromise: Promise<StoredSession> | null = null;

  private readBrowserStorage(): StoredSession | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      return null;
    }
  }

  private writeBrowserStorage(session: StoredSession | null): void {
    if (typeof window === "undefined") return;
    if (!session) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  public extractCompanyIdFromToken(accessToken: string): string | null {
    try {
      const payload = accessToken.split(".")[1];
      if (!payload) return null;
      const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      const cid = decoded.cid;
      return typeof cid === "string" ? cid : null;
    } catch {
      return null;
    }
  }

  public async loadSession(): Promise<StoredSession | null> {
    if (this.memorySession) return this.memorySession;

    const tauri = await tauriInvoke<StoredSession>("auth_load_session");
    if (tauri) {
      this.memorySession = tauri;
      return tauri;
    }

    const browser = this.readBrowserStorage();
    this.memorySession = browser;
    return browser;
  }

  public async saveSession(session: StoredSession): Promise<void> {
    this.memorySession = session;
    await tauriInvoke<void>("auth_store_session", { payloadJson: JSON.stringify(session) });
    this.writeBrowserStorage(session);
  }

  public async clearSession(): Promise<void> {
    this.memorySession = null;
    await tauriInvoke<void>("auth_clear_session");
    this.writeBrowserStorage(null);
  }

  public async logoutFromApi(session: StoredSession): Promise<void> {
    try {
      await fetch(`${authBaseUrl()}/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": operationsApiKey(),
          Authorization: `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({ sessionId: session.session.sessionId })
      });
    } catch {
      // Best-effort
    }
  }

  public async logoutAllSessions(): Promise<void> {
    const session = await this.loadSession();
    if (!session) return;
    try {
      await fetch(`${authBaseUrl()}/logout/all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": operationsApiKey(),
          Authorization: `Bearer ${session.accessToken}`
        }
      });
    } catch {
      // Best-effort
    }
    await this.clearSession();
  }

  public async logoutDevice(deviceId: string): Promise<void> {
    const session = await this.loadSession();
    if (!session) return;
    await fetch(`${authBaseUrl()}/logout/device/${encodeURIComponent(deviceId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": operationsApiKey(),
        Authorization: `Bearer ${session.accessToken}`
      }
    });
  }

  public async logoutAndRedirectToLogin(reason = "expired"): Promise<void> {
    const session = await this.loadSession();
    if (session) await this.logoutFromApi(session);
    await this.clearSession();

    if (typeof window === "undefined" || this.redirectInProgress) return;
    this.redirectInProgress = true;

    window.dispatchEvent(new CustomEvent("parkflow-logout"));

    if (window.location.pathname.startsWith("/login")) return;

    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/login?reason=${encodeURIComponent(reason)}&next=${next}`);
  }

  public async login(request: LoginRequest): Promise<StoredSession> {
    const validatedRequest = validatePayloadOrThrow(authLoginRequestSchema, request);
    const response = await fetch(`${authBaseUrl()}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": operationsApiKey()
      },
      body: JSON.stringify(validatedRequest)
    });

    if (!response.ok) throw new Error("Credenciales invalidas o equipo no autorizado");

    const payload = (await response.json()) as LoginResponse;
    const session: StoredSession = {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user,
      session: payload.session,
      offlineLease: payload.offlineLease
    };
    await this.saveSession(session);
    return session;
  }

  public async refreshIfNeeded(current: StoredSession): Promise<StoredSession> {
    const exp = Date.parse(current.session.accessTokenExpiresAtIso);
    const thresholdMs = 60_000;
    
    if (!Number.isFinite(exp) || exp - Date.now() > thresholdMs) {
      return current;
    }

    // Retornar la promesa en curso si ya estamos refrescando (Controlado)
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
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
          await this.logoutAndRedirectToLogin("expired");
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
        await this.saveSession(rotated);
        return rotated;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  public async authHeaders(options?: AuthHeaderOptions): Promise<HeadersInit> {
    const session = await this.loadSession();
    const terminalHeader = typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_TERMINAL_ID?.trim() || window.localStorage.getItem("parkflow_terminal_id")?.trim()
      : undefined;
    
    const auditReason = options?.auditReason?.trim();
    const auditValue = auditReason && auditReason.length > 0
      ? auditReason.length > 500 ? auditReason.slice(0, 500) : auditReason
      : null;

    if (!session) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-API-Key": operationsApiKey()
      };
      if (terminalHeader) headers["X-Parkflow-Terminal"] = terminalHeader;
      if (auditValue) headers["X-Parkflow-Audit-Reason"] = auditValue;
      if (options?.offline === true) headers["X-Parkflow-Offline"] = "1";
      return headers;
    }

    const refreshed = await this.refreshIfNeeded(session);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": operationsApiKey(),
      Authorization: `Bearer ${refreshed.accessToken}`
    };
    if (terminalHeader) headers["X-Parkflow-Terminal"] = terminalHeader;
    if (auditValue) headers["X-Parkflow-Audit-Reason"] = auditValue;
    if (options?.offline === true) headers["X-Parkflow-Offline"] = "1";
    return headers;
  }

  public async hasPermission(permission: Permission): Promise<boolean> {
    const session = await this.loadSession();
    return session ? session.user.permissions.includes(permission) : false;
  }

  public async isOfflineLeaseValid(): Promise<boolean> {
    const session = await this.loadSession();
    return session?.offlineLease ? Date.now() < Date.parse(session.offlineLease.expiresAtIso) : false;
  }

  public async currentUser(): Promise<AuthUser | null> {
    const session = await this.loadSession();
    if (!session) return null;
    const user = session.user;
    if (user && !user.companyId && session.accessToken) {
      const cid = this.extractCompanyIdFromToken(session.accessToken);
      if (cid) return { ...user, companyId: cid };
    }
    return user ?? null;
  }

  public async patchSessionUser(patch: Partial<AuthUser>): Promise<void> {
    const session = await this.loadSession();
    if (!session) return;
    await this.saveSession({
      ...session,
      user: { ...session.user, ...patch }
    });
  }

  public canAccessSuperAdminPortal(user: AuthUser | null): boolean {
    return user?.role === "SUPER_ADMIN";
  }

  public async handleAuthFailureStatus(status: number): Promise<void> {
    if (status === 401) await this.logoutAndRedirectToLogin("expired");
  }
}

export const authService = new AuthService();

// Export wrappers to maintain compatibility with existing imports
export const extractCompanyIdFromToken = (t: string) => authService.extractCompanyIdFromToken(t);
export const loadSession = () => authService.loadSession();
export const saveSession = (s: StoredSession) => authService.saveSession(s);
export const clearSession = () => authService.clearSession();
export const logoutFromApi = (s: StoredSession) => authService.logoutFromApi(s);
export const logoutAllSessions = () => authService.logoutAllSessions();
export const logoutDevice = (d: string) => authService.logoutDevice(d);
export const logoutAndRedirectToLogin = (r?: string) => authService.logoutAndRedirectToLogin(r);
export const login = (req: LoginRequest) => authService.login(req);
export const refreshIfNeeded = (s: StoredSession) => authService.refreshIfNeeded(s);
export const authHeaders = (opts?: AuthHeaderOptions) => authService.authHeaders(opts);
export const hasPermission = (p: Permission) => authService.hasPermission(p);
export const isOfflineLeaseValid = () => authService.isOfflineLeaseValid();
export const currentUser = () => authService.currentUser();
export const patchSessionUser = (p: Partial<AuthUser>) => authService.patchSessionUser(p);
export const canAccessSuperAdminPortal = (u: AuthUser | null) => authService.canAccessSuperAdminPortal(u);
export const handleAuthFailureStatus = (s: number) => authService.handleAuthFailureStatus(s);
