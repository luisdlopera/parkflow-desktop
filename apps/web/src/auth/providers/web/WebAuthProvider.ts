import { AuthProvider, AuthSession } from "../../core/AuthProvider";
import { LoginInput } from "../../../lib/validation/auth.schema";
import { authBase } from "@/lib/api/config";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";

export class WebAuthProvider implements AuthProvider {
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
      throw new Error((body as Record<string, string>).code || "AUTH_INVALID_CREDENTIALS");
    }

    const data = (await response.json()) as {
      user: AuthSession["user"];
      session: AuthSession["session"];
      device: { id: string };
      offlineLease: AuthSession["offlineLease"];
    };

    return {
      user: data.user,
      session: data.session,
      offlineLease: data.offlineLease,
      expiresAt: data.session.accessTokenExpiresAtIso,
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

      const data = await response.json() as {
        user: AuthSession["user"];
        session: AuthSession["session"];
        device: { id: string };
        offlineLease: AuthSession["offlineLease"];
      };

      return {
        user: data.user,
        session: data.session,
        offlineLease: data.offlineLease,
        expiresAt: data.session.accessTokenExpiresAtIso,
        permissions: data.user.permissions,
      };
    } catch {
      return null;
    }
  }

  async refresh(): Promise<AuthSession | null> {
    try {
      const response = await fetchWithCredentials(`${authBase()}/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        return null;
      }

      return this.restoreSession();
    } catch {
      return null;
    }
  }

  async getCurrentUser(): Promise<import("@parkflow/types").AuthUser | null> {
    const session = await this.restoreSession();
    return session?.user || null;
  }

  async authenticatedRequest<T>(url: string, options?: RequestInit): Promise<Response> {
    return fetchWithCredentials(url, options);
  }
}
