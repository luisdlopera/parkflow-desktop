import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockReplace = vi.fn();
const mockCurrentUser = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/lib/stores/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/lib/services/auth-domain.service", () => ({
  currentUser: (...args: any[]) => mockCurrentUser(...args),
}));

import { useAuthStore } from "@/lib/stores/auth.store";
import AuthGate from "../AuthGate";

describe("AuthGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockResolvedValue({
      id: "1",
      name: "Test",
      email: "test@test.com",
      role: "ADMIN",
      requirePasswordChange: false,
      onboardingCompleted: true,
      permissions: [],
    });
  });

  it("renders children when authenticated", () => {
    (useAuthStore as any).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
    });
    render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>
    );
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });

  it("redirects to login when not authenticated", () => {
    (useAuthStore as any).mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
    });
    render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>
    );
    expect(mockReplace).toHaveBeenCalledWith(
      "/login?next=%2Fdashboard"
    );
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("shows loading state when loading", () => {
    (useAuthStore as any).mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
    });
    const { container } = render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>
    );
    const skeletons = container.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain("protected content");
  });
});
