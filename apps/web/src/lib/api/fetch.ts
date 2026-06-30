import { errorService } from "@/lib/errors/error-service";
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
  const requestUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  const requestMethod = init?.method ?? (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET");

  const csrfHeaders = withCsrfHeader(init, init?.headers as Record<string, string> | undefined);
  const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
  const response = await fetchWithCredentials(input, { ...init, headers: csrfHeaders });

  const requestPath = new URL(response.url).pathname;

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

  if (!response.ok) throw await extractResponseError(response, requestUrl);
  if (response.status === 204) return {} as T;
  return (await response.json()) as T;
}

async function extractResponseError(response: Response, url: string): Promise<unknown> {
  try {
    const text = await response.text();
    const body = text ? safeParse(text) : {};
    return { ...body, status: response.status, url, endpoint: url };
  } catch {
    return { status: response.status, url, endpoint: url, message: `HTTP ${response.status}` };
  }
}

function safeParse(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text };
  }
}

export default safeFetch;
