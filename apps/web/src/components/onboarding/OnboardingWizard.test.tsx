import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

vi.mock("@/lib/onboarding-api", () => ({
  fetchOnboardingStatus: vi.fn(async () => ({
    companyId: "c1",
    plan: "LOCAL",
    onboardingCompleted: false,
    currentStep: 1,
    skipped: false,
    progressData: {},
    availableOptionsByPlan: { allowMultiLocation: false, allowAdvancedPermissions: false }
  })),
  saveOnboardingStep: vi.fn(async () => ({
    companyId: "c1",
    plan: "LOCAL",
    onboardingCompleted: false,
    currentStep: 2,
    skipped: false,
    progressData: {},
    availableOptionsByPlan: { allowMultiLocation: false, allowAdvancedPermissions: false }
  })),
  skipOnboarding: vi.fn(async () => ({})),
  completeOnboarding: vi.fn(async () => ({}))
}));

describe("OnboardingWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders first step and progress", async () => {
    render(<OnboardingWizard companyId="c1" onDone={() => undefined} />);
    await waitFor(() => expect(screen.getByText("Paso 1 de 12")).toBeInTheDocument());
    expect(screen.getByText("Tipos de vehículo")).toBeInTheDocument();
    // should render help icons (title and question). pick the title help by its aria-controls id
    const helpButtons = screen.getAllByRole("button", { name: /Mostrar explicación/i });
    expect(helpButtons.length).toBeGreaterThanOrEqual(1);
    // prefer the inline help inside the question body (its aria-controls id starts with 'help-')
    const bodyHelp = helpButtons.find((b) => {
      const ac = b.getAttribute("aria-controls") || "";
      return ac.startsWith("step-help") || ac.startsWith("step-");
    });
    expect(bodyHelp).toBeDefined();
    const user = userEvent.setup();
    // hover opens the inline help (we also support click but hover is more reliable in tests)
    await user.hover(bodyHelp!);
    // the inline help contains the descriptive sentence we added - wait for it
    await screen.findByText(/Indica qué tipos de vehículos aceptas/i);
  });

  it("shows warning when skipping setup", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard companyId="c1" onDone={() => undefined} />);
    await waitFor(() => expect(screen.getByText("Paso 1 de 12")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Omitir parametrización" }));
    expect(
      screen.getByText("Se aplicará una configuración estándar. Podrás modificarla luego desde Configuración.")
    ).toBeInTheDocument();
  });
});
