import { renderHook, act, waitFor } from "@testing-library/react";
import { useSessionTimeout } from "../useSessionTimeout";

const mockReplace = vi.fn();
const mockLogout = vi.fn();

let mockIsAuthenticated = true;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/lib/stores/auth.store", () => ({
  useAuthStore: () => ({
    isAuthenticated: mockIsAuthenticated,
    logout: mockLogout,
  }),
}));

vi.mock("@/features/auth/services/auth-storage.service", () => ({
  clearSession: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  mockIsAuthenticated = true;
  mockReplace.mockClear();
  mockLogout.mockClear();
});

describe("useSessionTimeout", () => {
  it("starts with warning hidden", () => {
    const { result } = renderHook(() => useSessionTimeout(15));
    expect(result.current.warningVisible).toBe(false);
    expect(result.current.secondsLeft).toBe(60);
  });

  it("does not start timers when not authenticated", () => {
    mockIsAuthenticated = false;

    const { result } = renderHook(() => useSessionTimeout(15));

    expect(result.current.warningVisible).toBe(false);
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("cleans up on unmount", () => {
    const { unmount } = renderHook(() => useSessionTimeout(15));
    expect(() => unmount()).not.toThrow();
  });

  it("doLogout calls logout and redirects", async () => {
    const { result } = renderHook(() => useSessionTimeout(15));

    await act(async () => {
      result.current.doLogout();
    });

    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockReplace).toHaveBeenCalledWith("/login?reason=inactivity");
  });
});
