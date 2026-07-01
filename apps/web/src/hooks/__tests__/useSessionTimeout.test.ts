import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionTimeout } from "../core/useSessionTimeout";

const mockReplace = vi.fn();
const mockLogout = vi.fn();
const mockProviderLogout = vi.fn();

let mockIsAuthenticated = true;

vi.mock("next/navigation", () => ({
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/lib/stores/auth.store", () => ({
  useAuthStore: () => ({
    isAuthenticated: mockIsAuthenticated,
    logout: mockLogout,
  }),
}));

vi.mock("@/lib/services/auth-storage.service", () => ({
  clearSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/auth/runtime/createAuthProvider", () => ({
  createAuthProvider: () => Promise.resolve({
    logout: mockProviderLogout,
  }),
}));

beforeEach(() => {
  mockIsAuthenticated = true;
  mockReplace.mockClear();
  mockLogout.mockClear();
  mockProviderLogout.mockClear();
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

  it("doLogout calls backend logout and redirects", async () => {
    const { result } = renderHook(() => useSessionTimeout(15));

    await act(async () => {
      result.current.doLogout();
      await Promise.resolve();
    });

    expect(mockProviderLogout).toHaveBeenCalledOnce();
    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockReplace).toHaveBeenCalledWith("/login?reason=inactivity");
  });
});
