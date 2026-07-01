import { authBase } from "@/lib/api/config";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";
import { saveSession } from "@/lib/services/auth-storage.service";

export async function refreshAuthTokens(): Promise<boolean> {
  try {
    const response = await fetchWithCredentials(`${authBase()}/refresh-token`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (response.ok) {
      // Token was refreshed server-side (httpOnly cookie updated)
      // Update local session state to reflect fresh auth
      try {
        // Re-load session to sync with server state
        const { loadSession } = await import("@/lib/services/auth-storage.service");
        const freshSession = await loadSession();
        if (freshSession) {
          await saveSession(freshSession);
        }
      } catch (error) {
        console.warn("[Auth Refresh] Could not sync session after refresh:", error);
        // Continue anyway - token is valid server-side
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error("[Auth Refresh] Token refresh failed:", error);
    return false;
  }
}
