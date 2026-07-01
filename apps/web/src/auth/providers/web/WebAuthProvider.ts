import { AuthProvider, AuthSession } from "../../core/AuthProvider";
import { LoginInput } from "../../../lib/validation/auth.schema";
import { authBase } from "@/lib/api/config";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";
import { refreshAuthTokens } from "@/lib/api/auth-refresh";

export class WebAuthProvider implements AuthProvider {
  private refreshPromise: Promise<AuthSession | null> | null = null;

  async login(credentials: LoginInput): Promise<AuthSession> {
    const response = await fetchWithCredentials(`${authBase()}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        rememberMe: credentials.rememberMe ?? false,
        deviceId: "web-default",
        deviceName: "Web Browser",
        platform: "web",
        fingerprint: "browser",
        offlineRequestedHours: 0,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const code = body?.error?.code || body?.code || "AUTH_INVALID_CREDENTIALS";
      const message = body?.error?.message || body?.message || "Invalid credentials";
      
      const error = new Error(message);
      (error as any).code = code;
      throw error;
    }

    const rawData = await response.json();
    const data = (rawData && 'data' in rawData ? rawData.data : rawData) as {
      user: AuthSession["user"];
      session: AuthSession["session"];
      device: { id: string };
      offlineLease: AuthSession["offlineLease"];
    };

    return {
      user: data.user,
      session: data.session,
      offlineLease: data.offlineLease,
      expiresAt: (data.session as any).accessTokenExpiresAtIso || (data.session as any).accessTokenExpiresAt,
      permissions: data.user.permissions,
    };
  }

  async logout(): Promise<void> {
    try {
      await fetchWithCredentials(`${authBase()}/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      // Best-effort: cookies will expire
    }
  }

  async logoutAll(): Promise<void> {
    try {
      await fetchWithCredentials(`${authBase()}/logout/all`, {
        method: "POST",
      });
    } catch {
      // Best-effort: cookies will expire
    }
  }

  async restoreSession(): Promise<AuthSession | null> {
    try {
      const response = await fetchWithCredentials(`${authBase()}/restore-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        return null;
      }

      const rawData = await response.json();
      const data = (rawData && 'data' in rawData ? rawData.data : rawData) as {
        user: AuthSession["user"];
        session: AuthSession["session"];
        device: { id: string };
        offlineLease: AuthSession["offlineLease"];
      };

      return {
        user: data.user,
        session: data.session,
        offlineLease: data.offlineLease,
        expiresAt: (data.session as any).accessTokenExpiresAtIso || (data.session as any).accessTokenExpiresAt,
        permissions: data.user.permissions,
      };
    } catch {
      return null;
    }
  }

  async refresh(): Promise<AuthSession | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshed = await refreshAuthTokens();
        if (!refreshed) {
          return null;
        }

        return await this.restoreSession();
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async getCurrentUser(): Promise<import("@parkflow/types").AuthUser | null> {
    const session = await this.restoreSession();
    return session?.user || null;
  }

  async authenticatedRequest<T>(url: string, options?: RequestInit): Promise<Response> {
    return fetchWithCredentials(url, options);
  }
}
