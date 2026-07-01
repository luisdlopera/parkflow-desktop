import { withCsrfHeader } from "@/lib/api/csrf";
import { apiBase, authBase, opsBase, cfgBase } from "@/lib/api/config";
import { throwApiError } from "./api-error";
import { refreshAuthTokens } from "./auth-refresh";

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];
let authExpired = false;
let refreshTokenPromise: Promise<Response> | null = null;

function resolveBackendUrl(input: FetchInput): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  if (input && typeof input === 'object' && 'url' in input) {
    return (input as Request).url;
  }
  return String(input);
}

// Interceptor base que parsea BusinessException y formatea ApiResponse
async function handleResponse(response: Response, requestUrl: string, init?: FetchInit) {
  if (response.ok) return response;
  
  if (response.status === 401) {
    return response;
  }

  // Parse using the robust normalizeApiError
  const { normalizeApiError } = await import("@/lib/errors/normalize-api-error");
  const apiError = await normalizeApiError(response);

  // Extract silent toast setting case-insensitively
  let isSilent = false;
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      isSilent = init.headers.get("X-Parkflow-Auth-Toast-Silent") === "1";
    } else if (Array.isArray(init.headers)) {
      isSilent = init.headers.find(([k]) => k.toLowerCase() === "x-parkflow-auth-toast-silent")?.[1] === "1";
    } else {
      const headersRecord = init.headers as Record<string, string>;
      isSilent = headersRecord["X-Parkflow-Auth-Toast-Silent"] === "1" || headersRecord["x-parkflow-auth-toast-silent"] === "1";
    }
  }

  if (!isSilent && typeof window !== "undefined") {
    try {
      const { toast } = await import("sonner");
      toast.error(apiError.message || "Ha ocurrido un error en la operación");
    } catch { /* ignore toast error */ }
  }

  throw apiError;
}

export async function fetchWithCredentials(input: FetchInput, init?: FetchInit): Promise<Response> {
  const headers = withCsrfHeader(init, init?.headers as Record<string, string> | undefined);
  const mergedInit: FetchInit = { credentials: "include", ...init, headers };

  const url = resolveBackendUrl(input);
  const isAuthRequest = url.includes('/api/v1/auth/') || url.includes('/auth/login') || url.includes('/auth/restore-session') || url.includes('/auth/logout');

  // Si hay un refresco en curso y no somos una petición de auth, esperamos
  if (refreshTokenPromise && !isAuthRequest) {
    await refreshTokenPromise;
  }

  const response = await fetch(input, mergedInit);

  if (response.ok && isAuthRequest) {
    authExpired = false;
  }

  if (response.status === 401 && !isAuthRequest && typeof window !== "undefined") {
    // Skip global logout interceptor during tests to avoid test pollution
    if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
      return response;
    }

    if (!refreshTokenPromise) {
      refreshTokenPromise = (async () => {
        const refreshed = await refreshAuthTokens();
        if (refreshed) {
          try {
            const { broadcastAuthEvent } = await import("@/hooks/auth/useAuthBroadcast");
            broadcastAuthEvent({ type: "auth:token_refreshed" });
          } catch {
            /* ignore */
          }
        }
        return new Response(null, { status: refreshed ? 200 : 401 });
      })().finally(() => {
        refreshTokenPromise = null;
      });

      const refreshOk = await refreshTokenPromise;
      if (refreshOk.ok) {
        authExpired = false;
        return fetch(input, mergedInit).then(res => handleResponse(res, url, mergedInit));
      }

      if (!authExpired) {
        authExpired = true;

        try {
          const { useAuthStore } = await import("@/lib/stores/auth.store");
          useAuthStore.getState().logout("expired");
        } catch { /* ignore */ }

        try {
          const { toast } = await import("sonner");
          toast.error("Tu sesión ha expirado, por favor inicia sesión nuevamente.");
        } catch { /* ignore */ }
      }
    } else {
      await refreshTokenPromise;
      // Reintentar la petición original con el nuevo token si lo hubiera
      return fetch(input, mergedInit).then(res => handleResponse(res, url, mergedInit));
    }
  }

  return handleResponse(response, url, mergedInit);
}
