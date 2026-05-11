import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../mocks/server";

const authBase = "http://localhost:6011/api/v1/auth";

function sampleLoginResponse(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    tokenType: "Bearer",
    user: {
      id: "user-1",
      name: "Admin",
      email: "admin@parkflow.local",
      role: "ADMIN",
      permissions: ["tickets:emitir", "configuracion:leer"],
      active: true,
      passwordChangedAtIso: null
    },
    session: {
      sessionId: "session-1",
      userId: "user-1",
      deviceId: "desktop-default",
      issuedAtIso: new Date(now).toISOString(),
      accessTokenExpiresAtIso: new Date(now + 15 * 60_000).toISOString(),
      refreshTokenExpiresAtIso: new Date(now + 7 * 24 * 60 * 60_000).toISOString(),
      lastSeenAtIso: new Date(now).toISOString()
    },
    device: {
      id: "device-1",
      displayName: "Caja principal",
      platform: "desktop",
      fingerprint: "local-dev",
      authorized: true,
      revokedAtIso: null,
      lastSeenAtIso: new Date(now).toISOString()
    },
    offlineLease: null,
    ...overrides
  };
}

async function importAuth() {
  vi.resetModules();
  return import("./auth");
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("auth client", () => {
  it("logs in, sends API key, persists the session, and exposes the current user", async () => {
    const { login, loadSession, currentUser, hasPermission } = await importAuth();
    let requestHeaders: Headers | null = null;

    server.use(
      http.post(`${authBase}/login`, async ({ request }) => {
        requestHeaders = request.headers;
        const body = await request.json();
        expect(body).toMatchObject({
          email: "admin@parkflow.local",
          password: "secret",
          deviceId: "desktop-default"
        });
        return HttpResponse.json(sampleLoginResponse());
      })
    );

    const session = await login({
      email: "admin@parkflow.local",
      password: "secret",
      deviceId: "desktop-default",
      deviceName: "Caja principal",
      platform: "desktop",
      fingerprint: "local-dev",
      offlineRequestedHours: 48
    });

    expect(requestHeaders?.get("X-API-Key")).toBe("dev-api-key-123");
    expect(session.accessToken).toBe("access-token");
    expect(await loadSession()).toEqual(session);
    expect(await currentUser()).toEqual(session.user);
    expect(await hasPermission("tickets:emitir")).toBe(true);
    expect(await hasPermission("usuarios:editar")).toBe(false);
    expect(window.localStorage.getItem("parkflow.auth.session")).toContain("access-token");
  });

  it("rejects invalid login requests before calling the API", async () => {
    const { login } = await importAuth();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      login({
        email: "not-an-email",
        password: "secret",
        deviceId: "desktop-default",
        deviceName: "Caja principal",
        platform: "desktop",
        fingerprint: "local-dev"
      })
    ).rejects.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("builds unauthenticated headers with terminal, audit, and offline metadata", async () => {
    const { authHeaders } = await importAuth();
    window.localStorage.setItem("parkflow_terminal_id", "TERM-1");

    await expect(authHeaders({ auditReason: "  supervisor override  ", offline: true })).resolves.toEqual({
      "Content-Type": "application/json",
      "X-API-Key": "dev-api-key-123",
      "X-Parkflow-Terminal": "TERM-1",
      "X-Parkflow-Audit-Reason": "supervisor override",
      "X-Parkflow-Offline": "1"
    });
  });

  it("refreshes an expiring session and uses the rotated access token", async () => {
    const { saveSession, authHeaders, loadSession } = await importAuth();
    const expiring = sampleLoginResponse({
      accessToken: "old-access-token",
      refreshToken: "old-refresh-token",
      session: {
        ...sampleLoginResponse().session,
        accessTokenExpiresAtIso: new Date(Date.now() + 10_000).toISOString()
      }
    });

    await saveSession({
      accessToken: expiring.accessToken,
      refreshToken: expiring.refreshToken,
      user: expiring.user,
      session: expiring.session,
      offlineLease: expiring.offlineLease
    });

    server.use(
      http.post(`${authBase}/refresh`, async ({ request }) => {
        await expect(request.json()).resolves.toMatchObject({
          refreshToken: "old-refresh-token",
          deviceId: "desktop-default"
        });
        return HttpResponse.json(sampleLoginResponse({ accessToken: "new-access-token", refreshToken: "new-refresh-token" }));
      })
    );

    await expect(authHeaders()).resolves.toMatchObject({
      Authorization: "Bearer new-access-token"
    });
    await expect(loadSession()).resolves.toMatchObject({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token"
    });
  });

  it("validates offline lease expiry and super admin access", async () => {
    const { saveSession, isOfflineLeaseValid, canAccessSuperAdminPortal } = await importAuth();
    const response = sampleLoginResponse({
      user: { ...sampleLoginResponse().user, role: "SUPER_ADMIN" },
      offlineLease: {
        sessionId: "session-1",
        userId: "user-1",
        deviceId: "desktop-default",
        issuedAtIso: new Date().toISOString(),
        expiresAtIso: new Date(Date.now() + 60_000).toISOString(),
        maxHours: 1,
        restrictedActions: ["usuarios:editar"]
      }
    });

    await saveSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
      session: response.session,
      offlineLease: response.offlineLease
    });

    await expect(isOfflineLeaseValid()).resolves.toBe(true);
    expect(canAccessSuperAdminPortal(response.user)).toBe(true);
    expect(canAccessSuperAdminPortal({ ...response.user, role: "ADMIN" })).toBe(false);
    expect(canAccessSuperAdminPortal(null)).toBe(false);
  });

  it("clears persisted sessions", async () => {
    const { saveSession, clearSession, loadSession } = await importAuth();
    const response = sampleLoginResponse();

    await saveSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
      session: response.session,
      offlineLease: response.offlineLease
    });

    await clearSession();

    await expect(loadSession()).resolves.toBeNull();
    expect(window.localStorage.getItem("parkflow.auth.session")).toBeNull();
  });
});
