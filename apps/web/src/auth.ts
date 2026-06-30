import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authBase } from "@/lib/api/config";
import type { AuthUser, DeviceInfo, OfflineLease, SessionInfo } from "@parkflow/types";

type BackendLoginPayload = {
  user: AuthUser;
  session: SessionInfo;
  device: DeviceInfo;
  offlineLease: OfflineLease | null;
};

type BackendTokens = {
  accessToken: string;
  refreshToken: string;
};

type ParkflowJwtPayload = BackendLoginPayload &
  BackendTokens & {
    backendAccessTokenExpiresAt: string;
    backendRefreshTokenExpiresAt: string;
    authError?: string;
  };

const TOKEN_REFRESH_SKEW_MS = 60_000;

let inFlightRefresh: Promise<ParkflowJwtPayload> | null = null;

function dedupedRefresh(token: ParkflowJwtPayload): Promise<ParkflowJwtPayload> {
  if (!inFlightRefresh) {
    inFlightRefresh = refreshBackendToken(token).finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

function apiKeyHeader(): Record<string, string> {
  const apiKey = process.env.NEXT_PUBLIC_API_KEY?.trim();
  return apiKey ? { "X-API-Key": apiKey } : {};
}

function parseCookieValue(setCookie: string, name: string): string | null {
  const cookie = setCookie
    .split(/,(?=\s*[^;,=\s]+=[^;]*)/)
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!cookie) return null;
  const rawValue = cookie.slice(name.length + 1).split(";")[0];
  return rawValue ? decodeURIComponent(rawValue) : null;
}

function getSetCookieHeader(response: Response): string {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = headers.getSetCookie?.();
  if (setCookies?.length) return setCookies.join(",");
  return response.headers.get("set-cookie") ?? "";
}

function extractBackendTokens(response: Response): BackendTokens {
  const setCookie = getSetCookieHeader(response);
  const accessToken = parseCookieValue(setCookie, "parkflow_access");
  const refreshToken = parseCookieValue(setCookie, "parkflow_refresh");
  if (!accessToken || !refreshToken) {
    throw new Error("AUTH_BACKEND_COOKIE_MISSING");
  }
  return { accessToken, refreshToken };
}

function toJwtPayload(payload: BackendLoginPayload, tokens: BackendTokens): ParkflowJwtPayload {
  return {
    ...payload,
    ...tokens,
    backendAccessTokenExpiresAt: payload.session.accessTokenExpiresAtIso,
    backendRefreshTokenExpiresAt: payload.session.refreshTokenExpiresAtIso,
  };
}

async function loginWithBackend(
  credentials: Record<string, string>,
): Promise<ParkflowJwtPayload & { id: string; name: string; email: string }> {
  const response = await fetch(`${authBase()}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...apiKeyHeader(),
    },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
      rememberMe: credentials.rememberMe === "true",
      deviceId: credentials.deviceId || "web-default",
      deviceName: credentials.deviceName || "Web Browser",
      platform: credentials.platform || "web",
      fingerprint: credentials.fingerprint || "browser",
      offlineRequestedHours: 0,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("AUTH_INVALID_CREDENTIALS");
  }

  const payload = (await response.json()) as BackendLoginPayload;
  return {
    id: payload.user.id,
    name: payload.user.name,
    email: payload.user.email,
    ...toJwtPayload(payload, extractBackendTokens(response)),
  } as ParkflowJwtPayload & { id: string; name: string; email: string };
}

async function refreshBackendToken(token: ParkflowJwtPayload): Promise<ParkflowJwtPayload> {
  try {
    const response = await fetch(`${authBase()}/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `parkflow_refresh=${encodeURIComponent(token.refreshToken)}`,
        ...apiKeyHeader(),
      },
      body: JSON.stringify({ deviceId: token.session.deviceId }),
      cache: "no-store",
    });

    if (!response.ok) {
      return { ...token, authError: "RefreshAccessTokenError" };
    }

    const payload = (await response.json()) as BackendLoginPayload;
    return toJwtPayload(payload, extractBackendTokens(response));
  } catch (error) {
    // If refresh fails for any reason (network, parsing, missing cookies, etc),
    // mark the token as errored so the client can redirect to login
    console.error("[Auth] Token refresh failed:", error);
    return { ...token, authError: "RefreshAccessTokenError" };
  }
}

async function logoutBackend(token?: Partial<ParkflowJwtPayload> | null): Promise<void> {
  if (!token?.session?.sessionId) return;
  try {
    await fetch(`${authBase()}/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token.refreshToken ? { Cookie: `parkflow_refresh=${encodeURIComponent(token.refreshToken)}` } : {}),
        ...apiKeyHeader(),
      },
      body: JSON.stringify({ sessionId: token.session.sessionId, refreshToken: token.refreshToken }),
      cache: "no-store",
    });
  } catch {
    // Best-effort logout; Auth.js still clears its httpOnly session cookie.
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "ParkFlow",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember me", type: "text" },
        deviceId: { label: "Device ID", type: "text" },
        deviceName: { label: "Device Name", type: "text" },
        platform: { label: "Platform", type: "text" },
        fingerprint: { label: "Fingerprint", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        return loginWithBackend(credentials);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return { ...token, ...(user as ParkflowJwtPayload) };
      }

      const parkflowToken = token as unknown as ParkflowJwtPayload;
      if (parkflowToken.authError) {
        return token;
      }

      const expiresAt = Date.parse(parkflowToken.backendAccessTokenExpiresAt ?? "");
      if (!Number.isFinite(expiresAt)) {
        return token;
      }

      if (Date.now() < expiresAt - TOKEN_REFRESH_SKEW_MS) {
        return token;
      }

      return (await dedupedRefresh(parkflowToken)) as never;
    },
    async session({ session, token }) {
      const parkflowToken = token as unknown as ParkflowJwtPayload;
      session.user = parkflowToken.user;
      session.parkflow = {
        session: parkflowToken.session,
        device: parkflowToken.device,
        offlineLease: parkflowToken.offlineLease,
        accessTokenExpiresAtIso: parkflowToken.backendAccessTokenExpiresAt,
        refreshTokenExpiresAtIso: parkflowToken.backendRefreshTokenExpiresAt,
        error: parkflowToken.authError,
      };
      return session;
    },
  },
  events: {
    async signOut(message) {
      await logoutBackend("token" in message ? (message.token as Partial<ParkflowJwtPayload>) : null);
    },
  },
};

export type { BackendLoginPayload, ParkflowJwtPayload };
