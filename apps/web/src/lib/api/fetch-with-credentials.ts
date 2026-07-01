import { withCsrfHeader } from "@/lib/api/csrf";
import { apiBase, authBase, opsBase, cfgBase } from "@/lib/api/config";

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];
let authExpired = false;

function resolveBackendUrl(input: FetchInput): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  if (input && typeof input === 'object' && 'url' in input) {
    return (input as Request).url;
  }
  return String(input);
}

export async function fetchWithCredentials(input: FetchInput, init?: FetchInit): Promise<Response> {
  const headers = withCsrfHeader(init, init?.headers as Record<string, string> | undefined);
  const mergedInit: FetchInit = { credentials: "include", ...init, headers };

  const url = resolveBackendUrl(input);
  const isAuthRequest = url.includes('/api/v1/auth/') || url.includes('/auth/login') || url.includes('/auth/restore-session') || url.includes('/auth/logout');

  const response = await fetch(input, mergedInit);

  if (response.ok && isAuthRequest) {
    authExpired = false;
  }

  if (response.status === 401 && !isAuthRequest && typeof window !== "undefined") {
    // Skip global logout interceptor during tests to avoid test pollution from unhandled MSW endpoints
    if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
      return response;
    }

    if (!authExpired) {
      authExpired = true;

      try {
        const { useAuthStore } = await import("@/lib/stores/auth.store");
        useAuthStore.getState().logout("expired");
      } catch {}

      try {
        const { toast } = await import("sonner");
        toast.error("Tu sesión ha expirado, por favor inicia sesión nuevamente.");
      } catch {}
    }
    return response;
  }

  return response;
}
