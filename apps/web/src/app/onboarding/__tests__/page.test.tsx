import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import OnboardingPage from "../page";

vi.mock("next/navigation", () => ({
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/services/auth-domain.service", () => ({
  currentUser: vi.fn(),
}));

vi.mock("@/components/onboarding/OnboardingWizard", () => ({
  default: ({ companyId, onDone }: { companyId: string; onDone: () => void }) => (
    <div data-testid="onboarding-wizard">
      <span data-testid="company-id">{companyId}</span>
      <button data-testid="on-done" onClick={onDone}>Finalizar</button>
    </div>
  ),
}));

vi.mock("@/lib/stores/auth.store", () => ({
  useAuthStore: vi.fn((selector) => {
    const state = {
      isLoading: false,
      user: null,
    };
    return typeof selector === "function" ? selector(state) : state;
  }),
}));

import { currentUser } from "@/lib/services/auth-domain.service";
import { useRouter } from "next/navigation";

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    vi.mocked(currentUser).mockReturnValue(new Promise(() => {}));
    render(<OnboardingPage />);
    expect(screen.getByText("Cargando onboarding...")).toBeInTheDocument();
  });

  it("redirects to login when user is null", async () => {
    const replace = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ replace, push: vi.fn() } as any);
    vi.mocked(currentUser).mockResolvedValue(null);
    render(<OnboardingPage />);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });
  });

  it("redirects to home when onboarding is completed", async () => {
    const replace = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ replace, push: vi.fn() } as any);
    vi.mocked(currentUser).mockResolvedValue({ onboardingCompleted: true, companyId: "c-1" } as any);
    render(<OnboardingPage />);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/");
    });
  });

  it("renders OnboardingWizard when user has onboarding pending", async () => {
    const replace = vi.fn();
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ replace, push } as any);
    vi.mocked(currentUser).mockResolvedValue({ onboardingCompleted: false, companyId: "c-1" } as any);
    render(<OnboardingPage />);
    await waitFor(() => {
      expect(screen.getByTestId("onboarding-wizard")).toBeInTheDocument();
      expect(screen.getByTestId("company-id")).toHaveTextContent("c-1");
    });
  });

  it("calls router.replace('/') when onDone is triggered", async () => {
    const replace = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ replace, push: vi.fn() } as any);
    vi.mocked(currentUser).mockResolvedValue({ onboardingCompleted: false, companyId: "c-1" } as any);
    render(<OnboardingPage />);
    await waitFor(() => {
      expect(screen.getByTestId("onboarding-wizard")).toBeInTheDocument();
    });
    screen.getByTestId("on-done").click();
    expect(replace).toHaveBeenCalledWith("/");
  });
});
