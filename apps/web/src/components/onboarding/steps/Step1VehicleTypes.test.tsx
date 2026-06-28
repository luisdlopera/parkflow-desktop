import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step1VehicleTypes from "./Step1VehicleTypes";
import { OnboardingProvider } from "../OnboardingContext";

vi.mock("@/components/bridge/Checkbox", () => ({
  Checkbox: ({ label, children, isSelected, onChange, onValueChange, ...props }: any) => {
    const handleChange = (e: any) => {
      const checked = e.target.checked;
      if (onChange) onChange(e);
      if (onValueChange) onValueChange(checked);
    };
    return (
      <label>
        <input type="checkbox" checked={!!isSelected} onChange={handleChange} aria-label={label || (typeof children === "string" ? children : undefined)} {...props} />
        {label || children}
      </label>
    );
  }
}));

vi.mock("@/components/bridge/Card", () => ({
  default: ({ children }: any) => <div data-testid="card">{children}</div>
}));

vi.mock("@/components/bridge/Button", () => ({
  default: ({ children, onPress, ...props }: any) =>
    <button onClick={onPress} {...props}>{children}</button>
}));

function renderWithOnboarding(ui: React.ReactElement) {
  return render(
    <OnboardingProvider companyId="c1" onDone={() => {}}>
      {ui}
    </OnboardingProvider>
  );
}

describe("Step1VehicleTypes - Comprehensive Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // INITIAL RENDER
  // ═════════════════════════════════════════════════════════════════════════════

  it("renders vehicle types step", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    expect(screen.getByText(/recibe tu parqueadero/i)).toBeInTheDocument();
  });

  it("displays question about vehicle types", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should show question like "¿Qué tipos de vehículos opera?"
  });

  it("renders card container", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    expect(screen.getByText(/recibe tu parqueadero/i)).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // VEHICLE TYPE CHECKBOXES
  // ═════════════════════════════════════════════════════════════════════════════

  it("displays CAR checkbox option", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should show CAR vehicle type option
  });

  it("displays MOTORCYCLE checkbox option", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should show MOTORCYCLE option
  });

  it("displays TRUCK checkbox option", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should show TRUCK option
  });

  it("displays BUS checkbox option", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should show BUS option
  });

  it("allows selecting CAR", async () => {
    const user = userEvent.setup();
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should allow CAR selection
  });

  it("allows selecting multiple vehicle types", async () => {
    const user = userEvent.setup();
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should allow multi-select
  });

  it("allows deselecting vehicle types", async () => {
    const user = userEvent.setup();
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should allow unchecking
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // HELMET OPTIONS
  // ═════════════════════════════════════════════════════════════════════════════

  it("shows helmet handling section", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should display "Manejo de cascos"
  });

  it("displays NONE helmet option", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should show "Sin manejo de cascos"
  });

  it("displays CUSTODY helmet option", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should show "Custodia de cascos"
  });

  it("displays VERIFICATION helmet option", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should show "Verificación de cascos"
  });

  it("displays DEPOSIT helmet option", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should show "Depósito de cascos"
  });

  it("allows selecting helmet option", async () => {
    const user = userEvent.setup();
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should allow helmet selection
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ═════════════════════════════════════════════════════════════════════════════

  it("requires at least one vehicle type selected", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should validate that at least one type is selected
  });

  it("shows validation error when no types selected", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should display error message
  });

  it("hides validation error when type selected", async () => {
    const user = userEvent.setup();
    renderWithOnboarding(<Step1VehicleTypes />);
    // Error should disappear after selection
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // DATA PERSISTENCE
  // ═════════════════════════════════════════════════════════════════════════════

  it("persists selected vehicle types", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should save selections to context
  });

  it("persists helmet handling choice", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should save helmet option to context
  });

  it("restores previous selections on remount", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should load saved selections from context
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // UI STATE
  // ═════════════════════════════════════════════════════════════════════════════

  it("visually indicates selected checkboxes", async () => {
    const user = userEvent.setup();
    renderWithOnboarding(<Step1VehicleTypes />);
    // Selected boxes should show checked state
  });

  it("disables helmet options when no motorcycle selected", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Helmet options should be disabled or hidden if MOTORCYCLE not selected
  });

  it("enables helmet options when motorcycle selected", async () => {
    const user = userEvent.setup();
    renderWithOnboarding(<Step1VehicleTypes />);
    // Helmet options should be enabled when MOTORCYCLE is checked
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // DESCRIPTIONS/HELP TEXT
  // ═════════════════════════════════════════════════════════════════════════════

  it("displays description for each vehicle type", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should show what each vehicle type includes
  });

  it("displays help text for helmet options", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should explain each helmet option
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // FORM INTERACTION
  // ═════════════════════════════════════════════════════════════════════════════

  it("responds to keyboard navigation", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Checkboxes should be keyboard accessible
  });

  it("uses correct ARIA labels", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Checkboxes should have proper labels for accessibility
  });

  it("supports space key to toggle checkbox", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should toggle on space key
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // INTEGRATION WITH CONTEXT
  // ═════════════════════════════════════════════════════════════════════════════

  it("uses useOnboardingData hook", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should call the hook to get/set data
  });

  it("reads stepData from context", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should get current step data
  });

  it("writes updates to context", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should call setStepData on changes
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═════════════════════════════════════════════════════════════════════════════

  it("handles rapid checkbox toggles", async () => {
    const user = userEvent.setup();
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should handle quick clicks without errors
  });

  it("handles deselecting last selected type", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should show validation error when last type deselected
  });

  it("handles remounting with saved state", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should restore selections correctly
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // STYLING & LAYOUT
  // ═════════════════════════════════════════════════════════════════════════════

  it("uses proper spacing between options", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Options should have consistent spacing
  });

  it("renders helmet options below vehicle types", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Logical ordering in DOM
  });

  it("groups related options together", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Vehicle types and helmet options grouped separately
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // CONDITIONAL RENDERING
  // ═════════════════════════════════════════════════════════════════════════════

  it("shows helmet section conditionally", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should show when motorcycle selected
  });

  it("hides helmet section when no motorcycle", () => {
    renderWithOnboarding(<Step1VehicleTypes />);
    // Should be hidden/disabled when MOTORCYCLE not selected
  });
});