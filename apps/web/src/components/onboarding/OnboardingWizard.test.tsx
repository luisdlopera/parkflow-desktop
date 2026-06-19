import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { DialogProvider } from "@/components/ui/DialogProvider";

// Mock next/navigation so useRouter doesn't throw in jsdom
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock useDialog so confirm() resolves immediately without rendering HeroUI AlertDialog
// (which isn't fully supported in jsdom). The modal behavior is tested separately in
// DialogProvider.test.tsx; here we only care about OnboardingWizard's flow.
vi.mock("@/components/ui/DialogProvider", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/components/ui/DialogProvider")>();
  return {
    ...original,
    useDialog: () => ({
      confirm: vi.fn().mockResolvedValue(true),
      prompt: vi.fn().mockResolvedValue(null),
    }),
  };
});


vi.mock("@/lib/onboarding-api", () => ({
  fetchOnboardingStatus: vi.fn(async () => ({
    companyId: "c1",
    plan: "LOCAL",
    onboardingCompleted: false,
    currentStep: 1,
    skipped: false,
    progressData: {
      step_1: { vehicleTypes: ["CAR"], helmetHandling: "NONE" },
      step_2: { totalCapacity: 10 },
      step_3: { billingModel: "HOURLY", baseValue: 1000 },
      step_4: { countryCode: "CO" },
      step_6: { paymentMethods: ["CASH"] },
    },
    availableOptionsByPlan: { allowMultiLocation: false, allowAdvancedPermissions: false }
  })),
  saveOnboardingStep: vi.fn(async () => ({
    companyId: "c1",
    plan: "LOCAL",
    onboardingCompleted: false,
    currentStep: 2,
    skipped: false,
    progressData: {
      step_1: { vehicleTypes: ["CAR"], helmetHandling: "NONE" },
      step_2: { totalCapacity: 10 },
      step_3: { billingModel: "HOURLY", baseValue: 1000 },
      step_4: { countryCode: "CO" },
      step_6: { paymentMethods: ["CASH"] },
    },
    availableOptionsByPlan: { allowMultiLocation: false, allowAdvancedPermissions: false }
  })),
  skipOnboarding: vi.fn(async () => ({})),
  completeOnboarding: vi.fn(async () => ({}))
}));

// Mock window.location.assign so it doesn't throw in jsdom
const assignMock = vi.fn();
Object.defineProperty(window, "location", {
  value: { ...window.location, assign: assignMock },
  writable: true,
});

/** Wrap under DialogProvider so that the real context is available
 * even though useDialog is mocked at module level. */
function renderWithDialog(ui: React.ReactElement) {
  return render(<DialogProvider>{ui}</DialogProvider>);
}

describe("OnboardingWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assignMock.mockReset();
  });

  it("renders first step and progress", async () => {
    renderWithDialog(<OnboardingWizard companyId="c1" onDone={() => undefined} />);
    await waitFor(() => expect(screen.getByText("Paso 1 de 12")).toBeInTheDocument());
    expect(screen.getByText("Tipos de vehículo")).toBeInTheDocument();
  });

  it("shows warning when skipping setup (skip button visible when required steps complete)", async () => {
    renderWithDialog(<OnboardingWizard companyId="c1" onDone={() => undefined} />);
    await waitFor(() => expect(screen.getByText("Paso 1 de 12")).toBeInTheDocument());
    // The "Omitir parametrización" button appears when required steps are complete
    const skipBtn = await screen.findByRole("button", { name: "Omitir parametrización" });
    expect(skipBtn).toBeInTheDocument();
  });

  it("calls skipOnboarding when skip is confirmed", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    const { skipOnboarding } = await import("@/lib/onboarding-api");

    renderWithDialog(<OnboardingWizard companyId="c1" onDone={onDone} />);
    await waitFor(() => expect(screen.getByText("Paso 1 de 12")).toBeInTheDocument());

    const skipBtn = await screen.findByRole("button", { name: "Omitir parametrización" });
    await user.click(skipBtn);

    // confirm() is mocked to return true, so skipOnboarding should be called
    await waitFor(() => {
      expect(skipOnboarding).toHaveBeenCalledWith("c1");
    });
    // window.location.assign is called (not onDone) — wizard navigates hard
    expect(assignMock).toHaveBeenCalledWith("/");
  });
});
