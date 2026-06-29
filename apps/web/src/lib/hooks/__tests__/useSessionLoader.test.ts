import { renderHook, act, waitFor } from "@testing-library/react";
import { useSessionLoader } from "../use-session-loader";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockFetchWithCredentials = vi.fn();
const mockSaveSession = vi.fn();
const mockSetUser = vi.fn();
const mockSetSessionExpiresAt = vi.fn();

vi.mock("@/lib/api/fetch-with-credentials", () => ({
  fetchWithCredentials: (...args: any[]) => mockFetchWithCredentials(...args),
}));

vi.mock("@/lib/services/auth-storage.service", () => ({
  saveSession: (...args: any[]) => mockSaveSession(...args),
}));

vi.mock("@/lib/stores/auth.store", () => ({
  useAuthStore: () => ({
    setUser: mockSetUser,
    setSessionExpiresAt: mockSetSessionExpiresAt,
    isLoading: true,
  }),
}));

describe("useSessionLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("should restore session when no logout flag is present", async () => {
    mockFetchWithCredentials.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: "1", name: "Test User", email: "test@example.com" },
        session: { accessTokenExpiresAtIso: "2099-01-01T00:00:00Z", accessToken: "token", sessionId: "sid" },
        offlineLease: null,
      }),
    });

    renderHook(() => useSessionLoader());

    await waitFor(() => {
      expect(mockFetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/restore-session"),
        expect.objectContaining({ method: "POST" })
      );
      expect(mockSaveSession).toHaveBeenCalled();
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: "test@example.com" })
      );
    });
  });

  it("should NOT restore session when logout flag is present in localStorage", async () => {
    // Set logout flag BEFORE rendering
    localStorage.setItem("parkflow_just_logged_out", "true");

    renderHook(() => useSessionLoader());

    await waitFor(() => {
      // Should NOT call restore-session API
      expect(mockFetchWithCredentials).not.toHaveBeenCalled();
      // Should clear user
      expect(mockSetUser).toHaveBeenCalledWith(null);
      // Should remove the logout flag after checking
      expect(localStorage.getItem("parkflow_just_logged_out")).toBeNull();
    });
  });

  it("should clear logout flag after checking it", async () => {
    localStorage.setItem("parkflow_just_logged_out", "true");

    renderHook(() => useSessionLoader());

    await waitFor(() => {
      expect(localStorage.getItem("parkflow_just_logged_out")).toBeNull();
    });
  });

  it("should handle 401 response without retrying", async () => {
    mockFetchWithCredentials.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    renderHook(() => useSessionLoader());

    await waitFor(() => {
      // Should set user to null without retrying
      expect(mockSetUser).toHaveBeenCalledWith(null);
      // Should only call once (no retries)
      expect(mockFetchWithCredentials).toHaveBeenCalledTimes(1);
    });
  });

  it("should detect logout from another tab via storage event", async () => {
    renderHook(() => useSessionLoader());

    await waitFor(() => {
      // Initial render completed
      expect(mockFetchWithCredentials).toHaveBeenCalled();
    });

    // Simulate logout in another tab
    act(() => {
      const event = new StorageEvent("storage", {
        key: "parkflow_just_logged_out",
        newValue: "true",
      });
      window.dispatchEvent(event);
    });

    await waitFor(() => {
      // Should set user to null when logout detected from another tab
      expect(mockSetUser).toHaveBeenCalledWith(null);
    });
  });

  it("should ignore storage events for other keys", async () => {
    mockFetchWithCredentials.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: "1", name: "Test", email: "test@example.com" },
        session: { accessTokenExpiresAtIso: "2099-01-01T00:00:00Z", accessToken: "token", sessionId: "sid" },
        offlineLease: null,
      }),
    });

    renderHook(() => useSessionLoader());

    await waitFor(() => {
      expect(mockFetchWithCredentials).toHaveBeenCalled();
    });

    const callCountBefore = mockSetUser.mock.calls.length;

    // Simulate storage event for different key
    act(() => {
      const event = new StorageEvent("storage", {
        key: "some_other_key",
        newValue: "true",
      });
      window.dispatchEvent(event);
    });

    await waitFor(() => {
      // Should not change user when different key is modified
      expect(mockSetUser.mock.calls.length).toBe(callCountBefore);
    });
  });

  it("should set session expiry when restore succeeds", async () => {
    const expiryTime = "2099-01-01T12:00:00Z";
    mockFetchWithCredentials.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: "1", name: "Test", email: "test@example.com" },
        session: {
          accessTokenExpiresAtIso: expiryTime,
          accessToken: "token",
          sessionId: "sid"
        },
        offlineLease: null,
      }),
    });

    renderHook(() => useSessionLoader());

    await waitFor(() => {
      expect(mockSetSessionExpiresAt).toHaveBeenCalledWith(expiryTime);
    });
  });
});
