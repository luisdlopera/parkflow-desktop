import { errorService } from "@/lib/errors/error-service";
import { withCsrfHeader } from "@/lib/api/csrf";
import { ApiError } from "@/lib/errors/ApiError";
import { normalizeApiError, handleNetworkError } from "@/lib/errors/normalize-api-error";

const toastCooldownMs = 3000;
const dedupe = new Map<string, number>();
const shouldToast = (key: string): boolean => {
  const now = Date.now();
  const last = dedupe.get(key) ?? 0;
  if (now - last < toastCooldownMs) {
    return false;
  }
  dedupe.set(key, now);
  return true;
};

const getHeader = (headers: HeadersInit | undefined, name: string): string | null => {
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get(name);
  if (Array.isArray(headers)) {
    const hit = headers.find(([k]) => k.toLowerCase() === name.toLowerCase());
    return hit?.[1] ?? null;
  }
  const recordValue = (headers as Record<string, string>)[name];
  if (recordValue) return recordValue;
  const lower = Object.entries(headers as Record<string, string>).find(
    ([k]) => k.toLowerCase() === name.toLowerCase()
  );
  return lower?.[1] ?? null;
};

export async function safeFetch<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const requestUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  const requestMethod = init?.method ?? (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET");

  const csrfHeaders = withCsrfHeader(init, init?.headers as Record<string, string> | undefined);
  const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
  
  let response: Response;
  try {
    response = await fetchWithCredentials(input, { ...init, headers: csrfHeaders });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw handleNetworkError(error);
  }

  let requestPath = "";
  try {
    requestPath = new URL(response.url || requestUrl).pathname;
  } catch {
    requestPath = requestUrl.startsWith("http") ? new URL(requestUrl).pathname : (requestUrl.startsWith("/") ? requestUrl : "/" + requestUrl);
  }

  const isLoginRequest = requestUrl.includes("/api/v1/auth/login");
  const isLogoutRequest = requestPath.includes("/api/v1/auth/logout");
  const isSilent = getHeader(init?.headers, "X-Parkflow-Auth-Toast-Silent") === "1";

  if (!isLoginRequest && !isLogoutRequest && response.status === 403) {
    if (typeof window !== "undefined") {
      const key = `${response.status}:${requestMethod}:${requestPath}`;
      if (!isSilent && shouldToast(key)) {
        errorService.toast.warning("Acción denegada — sin permisos suficientes. Contacta al administrador si crees que esto es un error.");
      }
    }
  }

  if (!response.ok) throw await normalizeApiError(response);
  if (response.status === 204) return {} as T;

  let json: any = {};
  if (typeof response.json === "function") {
    try {
      json = await response.json();
    } catch {
      // ignore JSON parsing errors for empty/non-JSON success responses
    }
  } else if ((response as any).body !== undefined) {
    json = (response as any).body;
  }

  return adaptResponsePayload(json) as T;
}

function adaptResponsePayload(json: unknown): unknown {
  // If response doesn't match canonical envelope shape, return as-is
  if (!json || typeof json !== "object" || !("success" in json) || !("data" in json)) {
    return json;
  }

  const envelope = json as Record<string, unknown>;
  const data = envelope.data;

  // Check if caller expects full envelope (with X-Expect-Envelope header)
  // Note: header check happens at call site; if envelope is needed, caller handles it

  // For paginated responses: return data with pagination meta attached
  const meta = envelope.meta as Record<string, unknown> | undefined;
  if (meta?.pagination) {
    const pag = meta.pagination as Record<string, unknown>;
    if (Array.isArray(data)) {
      // Array with pagination meta
      return {
        data,
        ...pag  // Spread pagination meta (page, size, totalElements, totalPages, hasNext, hasPrev, type, etc.)
      };
    } else if (data && typeof data === "object") {
      // Object with pagination meta
      return {
        ...data,
        ...pag
      };
    }
  }

  // For non-paginated responses: unwrap to data only (standard behavior)
  // If data is already an object, return it directly
  if (data && typeof data === "object") {
    return data;
  }

  // If data is a scalar or null, return wrapped in object for consistency
  return { data };
}

export default safeFetch;
