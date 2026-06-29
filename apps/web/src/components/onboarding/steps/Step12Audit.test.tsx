import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Step12Audit from "./Step12Audit";
import { OnboardingProvider } from "../OnboardingContext";

vi.mock("@/components/bridge/Card", () => ({
  default: ({ children }: any) => <div data-testid="card">{children}</div>
}));

vi.mock("@/components/bridge/Button", () => ({
  Button: ({ children, onPress, ...props }: any) =>
    <button onClick={onPress} {...props}>{children}</button>
}));

function renderWithOnboarding(ui: React.ReactElement) {
  return render(
    <OnboardingProvider companyId="c1" onDone={() => {}}>
      {ui}
    </OnboardingProvider>
  );
}

describe("Step12Audit (Revisión Final)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly", () => {
    renderWithOnboarding(<Step12Audit />);
    expect(screen.getByText("Resumen Ejecutivo")).toBeInTheDocument();
    expect(screen.getByText("Vehículos y Capacidad")).toBeInTheDocument();
    expect(screen.getByText("Tarifas y Operación")).toBeInTheDocument();
    expect(screen.getByText("Terminales y Caja")).toBeInTheDocument();
    expect(screen.getByText("Tickets y Placas")).toBeInTheDocument();
  });
});
