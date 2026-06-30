import { renderHook, act, waitFor } from "@testing-library/react";
import { useSessionLoader } from "../use-session-loader";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSetUser = vi.fn();
const mockSetSessionExpiresAt = vi.fn();

const mockAuthProvider = {
  restoreSession: vi.fn(),
  login: vi.fn(),
};

vi.mock("@/auth/runtime/createAuthProvider", () => ({
  createAuthProvider: () => Promise.resolve(mockAuthProvider),
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
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as any);
    vi.stubGlobal("sessionStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should restore session when no logout flag is present", async () => {
    const expiryTime = "2099-01-01T12:00:00Z";
    mockAuthProvider.restoreSession.mockResolvedValueOnce({
      user: { id: "1", name: "Test User", email: "test@example.com" },
      expiresAt: expiryTime,
    });

    renderHook(() => useSessionLoader());

    await waitFor(() => {
      expect(mockAuthProvider.restoreSession).toHaveBeenCalled();
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: "test@example.com" })
      );
      expect(mockSetSessionExpiresAt).toHaveBeenCalledWith(expiryTime);
    });
  });

  it("should NOT restore session when logout flag is present in localStorage", async () => {
    // Set logout flag BEFORE rendering
    vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
      if (key === "parkflow_just_logged_out") {
        (localStorage.getItem as any).mockReturnValue(value);
      }
    });
    vi.mocked(localStorage.getItem).mockReturnValue("true");

    renderHook(() => useSessionLoader());

    await waitFor(() => {
      // Should NOT call restoreSession API
      expect(mockAuthProvider.restoreSession).not.toHaveBeenCalled();
      // Should clear user
      expect(mockSetUser).toHaveBeenCalledWith(null);
      // Should remove the logout flag after checking
      expect(localStorage.removeItem).toHaveBeenCalledWith("parkflow_just_logged_out");
    });
  });

  it("should handle restoreSession returning null without retrying", async () => {
    mockAuthProvider.restoreSession.mockResolvedValueOnce(null);

    renderHook(() => useSessionLoader());

    await waitFor(() => {
      // Should set user to null
      expect(mockSetUser).toHaveBeenCalledWith(null);
      // Should only call once
      expect(mockAuthProvider.restoreSession).toHaveBeenCalledTimes(1);
    });
  });

  it("should retry when restoreSession throws an error", async () => {
    mockAuthProvider.restoreSession.mockRejectedValueOnce(new Error("Network Error"))
                                   .mockResolvedValueOnce({
                                     user: { id: "1", email: "test@example.com" },
                                     expiresAt: "2099-01-01T00:00:00Z"
                                   });

    renderHook(() => useSessionLoader());

    // With real timers, the component will wait 1 second and retry.
    // waitFor has a default timeout of 1000ms, let's bump it slightly to 2000ms just in case.
    await waitFor(() => {
      expect(mockAuthProvider.restoreSession).toHaveBeenCalledTimes(2);
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: "test@example.com" })
      );
    }, { timeout: 2500 });
  });

  it("should detect logout from another tab via storage event", async () => {
    renderHook(() => useSessionLoader());

    await waitFor(() => {
      // Initial render completed
      expect(mockAuthProvider.restoreSession).toHaveBeenCalled();
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
    mockAuthProvider.restoreSession.mockResolvedValueOnce({
      user: { id: "1", name: "Test", email: "test@example.com" },
      expiresAt: "2099-01-01T00:00:00Z"
    });

    renderHook(() => useSessionLoader());

    await waitFor(() => {
      expect(mockAuthProvider.restoreSession).toHaveBeenCalled();
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
});
