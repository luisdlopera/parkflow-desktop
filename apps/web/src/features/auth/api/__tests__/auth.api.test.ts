import { describe, it, expect, vi, beforeEach } from "vitest";
import { login, logoutFromApi, logoutAllSessions, logoutDevice } from "../auth.api";
import * as rememberMeService from "@/lib/services/remember-me.service";
import * as safeFetchModule from "@/lib/api/fetch";

const mockProvider = {
  login: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
};

vi.mock("@/auth/runtime/createAuthProvider", () => ({
  createAuthProvider: () => Promise.resolve(mockProvider),
}));

vi.mock("@/lib/services/remember-me.service", () => ({
  clearRememberMeEmail: vi.fn(),
}));

vi.mock("@/lib/api/fetch", () => ({
  safeFetch: vi.fn(),
}));

vi.mock("@/lib/api/config", () => ({
  authBase: vi.fn().mockReturnValue("http://localhost/api/auth"),
  API_CONFIG: { apiKey: "test-api-key" },
}));

describe("Auth API compatibility shim", () => {
  const mockSession = {
    user: { id: "usr-1", email: "test@example.com", permissions: [] },
    session: { sessionId: "sess-1", deviceId: "dev-1", accessTokenExpiresAtIso: new Date(Date.now() + 86400000).toISOString() },
    offlineLease: null,
    rememberMe: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as any);
    mockProvider.login.mockResolvedValue(mockSession);
    mockProvider.logout.mockResolvedValue(undefined);
    mockProvider.logoutAll.mockResolvedValue(undefined);
  });

  it("delegates login to the runtime auth provider", async () => {
    const result = await login({
      email: "test@example.com",
      password: "password",
      deviceId: "dev-1",
      deviceName: "test",
      platform: "web",
      fingerprint: "browser",
      rememberMe: true,
    });

    expect(mockProvider.login).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password",
      rememberMe: true,
    });
    expect(result).toEqual(mockSession);
  });

  it("delegates single logout to the runtime auth provider", async () => {
    await logoutFromApi(mockSession as any);
    expect(mockProvider.logout).toHaveBeenCalled();
  });

  it("delegates logout-all and clears remembered email", async () => {
    await logoutAllSessions();
    expect(window.localStorage.setItem).toHaveBeenCalledWith("parkflow_just_logged_out", "true");
    expect(mockProvider.logoutAll).toHaveBeenCalled();
    expect(rememberMeService.clearRememberMeEmail).toHaveBeenCalled();
  });

  it("keeps device logout as backend API operation", async () => {
    vi.mocked(safeFetchModule.safeFetch).mockResolvedValue({} as any);

    await logoutDevice("dev-1");

    expect(safeFetchModule.safeFetch).toHaveBeenCalledWith(
      "http://localhost/api/auth/logout/device/dev-1",
      expect.objectContaining({ method: "POST" }),
    );
    expect(rememberMeService.clearRememberMeEmail).toHaveBeenCalled();
  });
});
