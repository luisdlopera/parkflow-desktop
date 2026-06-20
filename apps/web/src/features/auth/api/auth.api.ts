import { authBase } from "@/lib/api/config";
import { authLoginRequestSchema, authRefreshRequestSchema } from "@/lib/validation/contracts";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";
import type { LoginRequest, LoginResponse } from "@parkflow/types";
import type { StoredSession } from "../types";
import { loadSession, saveSession, clearSession } from "../services/auth-storage.service";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";


function operationsApiKey(): string {
  const key = process.env.NEXT_PUBLIC_API_KEY;
  if (!key || key.trim().length === 0) return "";
  return key.trim();
}

export async function login(request: LoginRequest): Promise<StoredSession> {
  const validatedRequest = validatePayloadOrThrow(authLoginRequestSchema, request);
  const response = await fetchWithCredentials(`${authBase()}/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": operationsApiKey()
    },
    body: JSON.stringify(validatedRequest)
  });

  if (!response.ok) throw new Error("Credenciales invalidas o equipo no autorizado");

  const payload = (await response.json()) as LoginResponse;
  const session: StoredSession = {
    user: payload.user,
    session: payload.session,
    offlineLease: payload.offlineLease
  };
  await saveSession(session);
  return session;
}

export async function logoutFromApi(session: StoredSession): Promise<void> {
  try {
    await fetchWithCredentials(`${authBase()}/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": operationsApiKey()
      },
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
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": operationsApiKey()
      }
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
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": operationsApiKey()
    }
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
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": operationsApiKey()
        },
        // We no longer send refreshToken in body; the server will read the HTTP-Only cookie.
        body: JSON.stringify(validatePayloadOrThrow(authRefreshRequestSchema, {
          deviceId: current.session.deviceId
        }))
      });

      if (!response.ok) {
        await clearSession();
        throw new Error("No se pudo refrescar la sesion");
      }

      const payload = (await response.json()) as LoginResponse;
      const rotated: StoredSession = {
        user: payload.user,
        session: payload.session,
        offlineLease: payload.offlineLease
      };
      await saveSession(rotated);
      return rotated;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function authHeadersApiKey(): string {
  return operationsApiKey();
}
