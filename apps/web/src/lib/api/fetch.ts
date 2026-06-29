import { normalizeApiError, handleNetworkError } from "@/lib/errors/normalize-api-error";
import { toast } from "@heroui/react";
import { withCsrfHeader } from "@/lib/api/csrf";

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
  try {
    let response: Response;

    if (typeof window !== "undefined") {
      try {
        const { handleLocalFirstFetch } = await import("@/lib/local-first/fetch-interceptor");
        const localResponse = await handleLocalFirstFetch(input, init);
        if (localResponse) {
          response = localResponse;
        }
      } catch (err) {
        console.error("LocalFirst Interceptor load error:", err);
      }
    }

    // @ts-ignore
    if (!response) {
      const csrfHeaders = withCsrfHeader(init, init?.headers as Record<string, string> | undefined);
      response = await fetch(input, { credentials: 'include', ...init, headers: csrfHeaders });
    }

    const requestUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    const requestMethod = init?.method ?? (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET");
    const requestPath = new URL(response.url).pathname;
    
    const isLoginRequest = requestUrl.includes("/api/v1/auth/login");
    const isLogoutRequest = requestPath.includes("/api/v1/auth/logout");
    const isSilent = getHeader(init?.headers, "X-Parkflow-Auth-Toast-Silent") === "1";

    if (!isLoginRequest && !isLogoutRequest && (response.status === 401 || response.status === 403)) {
      if (typeof window !== "undefined") {
        const key = `${response.status}:${requestMethod}:${requestPath}`;
        if (response.status === 401) {
          import("@/lib/services/auth-storage.service").then(({ clearSession }) => {
            clearSession();
            const currentPath = window.location.pathname + window.location.search;
            const isOnboarding = currentPath.includes("/onboarding");
            const nextUrl = isOnboarding ? "/onboarding" : "/";
            window.location.href = `/login?next=${encodeURIComponent(nextUrl)}&reason=expired`;
          });
        }
        if (!isSilent && response.status === 403 && shouldToast(key)) {
          toast.warning("Acción denegada — sin permisos suficientes. Contacta al administrador si crees que esto es un error.");
        }
      }
    }

    if (!response.ok) throw await normalizeApiError(response);
    if (response.status === 204) return {} as T;
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "ApiError") throw err;
    throw handleNetworkError(err);
  }
}

export default safeFetch;
