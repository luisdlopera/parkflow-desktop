import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "./page";
import { server } from "../../mocks/server";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const authBase = "http://localhost:6011/api/v1/auth";

function loginResponse() {
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
      permissions: ["tickets:emitir"],
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
    offlineLease: null
  };
}

beforeEach(async () => {
  replace.mockReset();
  window.localStorage.clear();
  window.history.pushState({}, "", "/login");
  const { clearSession } = await import("../../lib/auth");
  await clearSession();
});

describe("LoginPage", () => {
  it("shows a validation error when password is missing", async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByTestId("login-button"));

    expect(await screen.findByTestId("error-message")).toHaveTextContent("Debes ingresar la contrasena");
    expect(replace).not.toHaveBeenCalled();
  });

  it("submits valid credentials and redirects to the requested path", async () => {
    let loginBody: unknown;
    window.history.pushState({}, "", "/login?next=%2Fcaja");

    server.use(
      http.post(`${authBase}/login`, async ({ request }) => {
        loginBody = await request.json();
        return HttpResponse.json(loginResponse());
      })
    );

    render(<LoginPage />);
    fireEvent.change(screen.getByTestId("password"), { target: { value: "Qwert.12345" } });
    fireEvent.click(screen.getByTestId("login-button"));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/caja"));
    expect(loginBody).toMatchObject({
      email: "admin@parkflow.local",
      password: "Qwert.12345",
      deviceId: "desktop-default",
      offlineRequestedHours: 48
    });
  });

  it("shows an authentication error when the API rejects credentials", async () => {
    server.use(
      http.post(`${authBase}/login`, () => {
        return HttpResponse.json({ code: "AUTH_INVALID_CREDENTIALS", message: "Credenciales invalidas" }, { status: 401 });
      })
    );

    render(<LoginPage />);
    fireEvent.change(screen.getByTestId("password"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByTestId("login-button"));

    expect(await screen.findByTestId("error-message")).toHaveTextContent("No fue posible iniciar sesión");
    expect(replace).not.toHaveBeenCalled();
  });
});
