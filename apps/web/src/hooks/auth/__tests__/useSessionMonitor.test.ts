import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useSessionMonitor } from "@/hooks/auth/useSessionMonitor";
import { useAuthStore } from "@/lib/stores/auth.store";

const mockPush = vi.fn();
const mockProvider = {
  refresh: vi.fn(),
  logout: vi.fn(),
};

vi.mock("next/navigation", () => ({
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/auth/runtime/createAuthProvider", () => ({
  createAuthProvider: () => Promise.resolve(mockProvider),
}));

function createSession(expiresInMs: number) {
  return {
    user: { id: "1", email: "test@example.com", companyId: "c1", permissions: [] },
    session: {
      sessionId: "sess-1",
      deviceId: "dev-1",
      accessTokenExpiresAtIso: new Date(Date.now() + expiresInMs).toISOString(),
    },
    offlineLease: null,
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    permissions: [],
  };
}

describe("useSessionMonitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider.refresh.mockReset();
    mockProvider.logout.mockReset();
    mockProvider.refresh.mockResolvedValue(createSession(3_600_000));
    useAuthStore.setState({
      isLoading: false,
      user: null,
      isAuthenticated: false,
      sessionExpiresAt: null,
      permissions: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not mark session expired when unauthenticated", async () => {
    const { result } = renderHook(() => useSessionMonitor());

    await waitFor(() => {
      expect(result.current.isExpired).toBe(false);
      expect(result.current.isChecking).toBe(false);
    });
  });

  it("refreshes near-expiry sessions through the backend", async () => {
    useAuthStore.setState({
      isLoading: false,
      isAuthenticated: true,
      user: { id: "1", name: "Test", email: "test@example.com", role: "ADMIN" } as any,
      sessionExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      permissions: [],
    });
    mockProvider.refresh.mockResolvedValue(createSession(3_600_000));

    const { result } = renderHook(() => useSessionMonitor());

    await waitFor(() => {
      expect(mockProvider.refresh).toHaveBeenCalled();
      expect(result.current.isExpired).toBe(false);
    });
  });

  it("marks the session expired when refresh fails", async () => {
    useAuthStore.setState({
      isLoading: false,
      isAuthenticated: true,
      user: { id: "1", name: "Test", email: "test@example.com", role: "ADMIN" } as any,
      sessionExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      permissions: [],
    });
    mockProvider.refresh.mockResolvedValue(null);

    const { result } = renderHook(() => useSessionMonitor());

    await waitFor(() => {
      expect(result.current.isExpired).toBe(true);
    });
  });

  it("forceLogout logs out and redirects", async () => {
    useAuthStore.setState({
      isLoading: false,
      isAuthenticated: true,
      user: { id: "1", name: "Test", email: "test@example.com", role: "ADMIN" } as any,
      sessionExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      permissions: [],
    });
    const { result } = renderHook(() => useSessionMonitor());

    await act(async () => {
      await result.current.forceLogout();
    });

    expect(mockProvider.logout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/login?reason=expired"));
  });
});
