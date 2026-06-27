import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step8Clients from "./Step8Clients";
import { OnboardingProvider } from "../OnboardingContext";

function renderWithOnboarding(ui: React.ReactElement) {
  return render(
    <OnboardingProvider companyId="c1" onDone={() => {}}>
      {ui}
    </OnboardingProvider>
  );
}

describe("Step8Clients - Comprehensive Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders clients step", () => {
    renderWithOnboarding(<Step8Clients />);
    expect(screen.getByText("¿Manejas clientes frecuentes o mensualidades?")).toBeInTheDocument();
  });

  it("displays client type description", () => {
    renderWithOnboarding(<Step8Clients />);
    expect(screen.getByText(/Activa esta opción si ofreces abonos, mensualidades o clientes frecuentes/i)).toBeInTheDocument();
  });

  it("allows toggling the switch", async () => {
    const user = userEvent.setup();
    renderWithOnboarding(<Step8Clients />);
    
    const switchControl = screen.getByRole("switch");
    expect(switchControl).not.toBeChecked();
    
    await user.click(switchControl);
    expect(switchControl).toBeChecked();
  });
});