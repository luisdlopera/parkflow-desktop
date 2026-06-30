import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/dashboard",
}));

// ──────────────────────────────────────────────────────────────────────────────
// Mocks de auth.store — Estado controlado desde test
// ──────────────────────────────────────────────────────────────────────────────
let mockState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  logout: vi.fn(),
};

vi.mock("@/lib/stores/auth.store", () => ({
  useAuthStore: (selector?: any) => {
    return selector ? selector(mockState) : mockState;
  },
}));

vi.mock("@/auth/runtime/detectRuntime", () => ({
  isTauri: () => false,
}));

vi.mock("@/auth/runtime/createAuthProvider", () => ({
  createAuthProvider: () => Promise.resolve({
    restoreSession: vi.fn(async () => null),
  }),
}));

import AuthGate from "../AuthGate";

describe("AuthGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      logout: vi.fn(),
    };
  });

  it("renders children when authenticated", () => {
    mockState = {
      ...mockState,
      user: {
        id: "1",
        name: "Test",
        email: "test@test.com",
        role: "ADMIN",
        requirePasswordChange: false,
        onboardingCompleted: true,
        permissions: [],
      },
      isAuthenticated: true,
    };
    render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>
    );
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });

  it("redirects to change-password when requirePasswordChange is true", async () => {
    mockState = {
      ...mockState,
      user: {
        id: "1",
        name: "Test",
        email: "test@test.com",
        role: "ADMIN",
        requirePasswordChange: true,
        onboardingCompleted: true,
        permissions: [],
      },
      isAuthenticated: true,
    };
    render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>
    );
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/change-password");
    });
  });

  it("redirects to onboarding when onboardingCompleted is false", async () => {
    mockState = {
      ...mockState,
      user: {
        id: "1",
        name: "Test",
        email: "test@test.com",
        role: "ADMIN",
        requirePasswordChange: false,
        onboardingCompleted: false,
        permissions: [],
      },
      isAuthenticated: true,
    };
    render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>
    );
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("returns null when not authenticated (web)", () => {
    mockState = { ...mockState, isLoading: false, isAuthenticated: false };
    const { container } = render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>
    );
    expect(container.textContent).not.toContain("protected content");
  });

  it("shows loading state when loading", () => {
    mockState = { ...mockState, isLoading: true, isAuthenticated: false, user: null };
    const { container } = render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>
    );
    const skeletons = container.querySelectorAll('[class*="rounded-xl"]');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain("protected content");
  });
});
