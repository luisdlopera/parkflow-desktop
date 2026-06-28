import { authBase, API_CONFIG } from "@/lib/api/config";
import { authLoginRequestSchema, authRefreshRequestSchema } from "@/lib/validation/contracts";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";
import type { LoginRequest, LoginResponse } from "@parkflow/types";
import type { StoredSession } from "../types";
import { loadSession, saveSession, clearSession } from "@/lib/services/auth-storage.service";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";
import { broadcastAuthEvent } from "@/hooks/auth/useAuthBroadcast";
import { useAuthStore } from "@/lib/stores/auth.store";


export async function login(request: LoginRequest): Promise<StoredSession> {
  const validatedRequest = validatePayloadOrThrow(authLoginRequestSchema, request);
  const response = await fetchWithCredentials(`${authBase()}/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validatedRequest)
  });

  if (!response.ok) throw new Error("Credenciales invalidas o equipo no autorizado");

  const payload = (await response.json()) as LoginResponse;
  const session: StoredSession = {
    user: payload.user,
    session: payload.session,
    offlineLease: payload.offlineLease,
    rememberMe: request.rememberMe ?? false
  };
  await saveSession(session);
  return session;
}

export async function logoutFromApi(session: StoredSession): Promise<void> {
  try {
    await fetchWithCredentials(`${authBase()}/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.session.sessionId })
    });
  } catch {
    // Best-effort
  }
}

export async function logoutAllSessions(): Promise<void> {
  const session = await loadSession();
  if (!session) return;
  try {
    await fetchWithCredentials(`${authBase()}/logout/all`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });
  } catch {
    // Best-effort
  }
  await clearSession();
}

export async function logoutDevice(deviceId: string): Promise<void> {
  const session = await loadSession();
  if (!session) return;
  await fetchWithCredentials(`${authBase()}/logout/device/${encodeURIComponent(deviceId)}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" }
  });
}

let refreshPromise: Promise<StoredSession> | null = null;

export async function refreshIfNeeded(current: StoredSession): Promise<StoredSession> {
  const exp = Date.parse(current.session.accessTokenExpiresAtIso);
  const thresholdMs = 60_000;

  if (!Number.isFinite(exp) || exp - Date.now() > thresholdMs) {
    return current;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetchWithCredentials(`${authBase()}/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        // Server reads the httpOnly refresh cookie automatically
        body: JSON.stringify(validatePayloadOrThrow(authRefreshRequestSchema, {
          deviceId: current.session.deviceId
        }))
      });

      if (!response.ok) {
        // PERMISSIONS_CHANGED: role changed — clear local session and broadcast logout
        // so ALL tabs redirect to login immediately with fresh permissions.
        let errorCode: string | undefined;
        try {
          const body = await response.clone().json() as { code?: string };
          errorCode = body?.code;
        } catch {
          // ignore parse errors
        }

        await clearSession();
        broadcastAuthEvent({ type: "auth:logout" });

        if (errorCode === "PERMISSIONS_CHANGED") {
          throw new Error("PERMISSIONS_CHANGED");
        }
        throw new Error("No se pudo refrescar la sesion");
      }

      const payload = (await response.json()) as LoginResponse;
      const rotated: StoredSession = {
        user: payload.user,
        session: payload.session,
        offlineLease: payload.offlineLease,
        rememberMe: current.rememberMe
      };
      await saveSession(rotated);
      // Update store so useSessionMonitor reads the correct new expiry
      useAuthStore.getState().setSessionExpiresAt(rotated.session.accessTokenExpiresAtIso);
      broadcastAuthEvent({ type: "auth:token_refreshed" });
      return rotated;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Used by auth-domain.service for general API calls that include X-API-Key
export function authHeadersApiKey(): string {
  const key = API_CONFIG.apiKey;
  return key && key.trim().length > 0 ? key.trim() : "";
}
