import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";
import { server } from "../../../mocks/server";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
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
      passwordChangedAtIso: null,
      onboardingCompleted: true,
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
  const { clearSession } = await import("@/lib/services/auth-storage.service");
  await clearSession();
});

describe("LoginPage", () => {
  it("renders the login form", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByTestId("password")).toBeInTheDocument();
    expect(screen.getByTestId("login-button")).toBeInTheDocument();
  });

  it("has email and password input fields", () => {
    render(<LoginPage />);

    const emailInput = screen.getByTestId("username") as HTMLInputElement;
    const passwordInput = screen.getByTestId("password") as HTMLInputElement;

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });
});
