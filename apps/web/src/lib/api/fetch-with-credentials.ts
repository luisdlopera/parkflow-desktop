import { withCsrfHeader } from "@/lib/api/csrf";
import { apiBase } from "@/lib/api/config";

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];
let authExpired = false;

export async function fetchWithCredentials(input: FetchInput, init?: FetchInit): Promise<Response> {
  const headers = withCsrfHeader(init, init?.headers as Record<string, string> | undefined);
  const response = await fetch(toSameOriginApiUrl(input), { credentials: "include", ...init, headers });

  if (response.status === 401 && typeof window !== "undefined") {
    if (!authExpired) {
      authExpired = true;
      const currentPath = window.location.pathname + window.location.search;
      const isOnboarding = currentPath.includes("/onboarding");
      const nextUrl = isOnboarding ? "/onboarding" : "/";

      try {
        const { useAuthStore } = await import("@/lib/stores/auth.store");
        useAuthStore.getState().logout();
      } catch (e) {}

      // Dispatch event for components (AuthGate) to listen and do router.push
      // Fallback to hard redirect if no listener (Tauri, offline, etc)
      const event = new CustomEvent("parkflow-auth-expired", {
        detail: { next: nextUrl },
      });
      window.dispatchEvent(event);

      // Hard redirect as fallback if event not handled
      setTimeout(() => {
        window.location.href = `/login?next=${encodeURIComponent(nextUrl)}&reason=expired`;
      }, 100);
    }
    // Devolver la respuesta para que el caller decida qué hacer (SWR lanzará error)
    return response;
  }

  return response;
}

function toSameOriginApiUrl(input: FetchInput): FetchInput {
  if (typeof window === "undefined" || typeof input !== "string") {
    return input;
  }

  const backendBase = apiBase().replace(/\/$/, "");
  if (!input.startsWith(`${backendBase}/`)) {
    return input;
  }

  return `/api/proxy${input.slice(backendBase.length)}`;
}

