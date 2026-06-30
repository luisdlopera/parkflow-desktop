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
  const isLoginRequest = url.includes('/api/v1/auth/login');

  const response = await fetch(input, mergedInit);

  if (response.status === 401 && !isLoginRequest && typeof window !== "undefined") {
    if (!authExpired) {
      authExpired = true;
      const currentPath = window.location.pathname + window.location.search;
      const isOnboarding = currentPath.includes("/onboarding");
      const nextUrl = isOnboarding ? "/onboarding" : "/";

      try {
        const { useAuthStore } = await import("@/lib/stores/auth.store");
        useAuthStore.getState().logout();
      } catch {}

      const event = new CustomEvent("parkflow-auth-expired", {
        detail: { next: nextUrl },
      });
      window.dispatchEvent(event);

      setTimeout(() => {
        window.location.href = `/login?next=${encodeURIComponent(nextUrl)}&reason=expired`;
      }, 100);
    }
    return response;
  }

  return response;
}
