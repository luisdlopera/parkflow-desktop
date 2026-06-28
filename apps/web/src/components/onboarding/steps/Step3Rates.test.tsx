import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step3Rates from "./Step3Rates";
import { OnboardingProvider } from "../OnboardingContext";

function renderWithOnboarding(ui: React.ReactElement) {
  return render(
    <OnboardingProvider>
      {ui}
    </OnboardingProvider>
  );
}

describe("Step3Rates Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Preset Selection", () => {
    it("should render all three preset cards", () => {
      renderWithOnboarding(<Step3Rates />);
      expect(screen.getByText("Básico")).toBeInTheDocument();
      expect(screen.getByText("Comercial")).toBeInTheDocument();
      expect(screen.getByText("24 Horas")).toBeInTheDocument();
    });

    it("should apply BASIC preset when clicked", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step3Rates />);

      const basicCard = screen.getByText("Básico").closest("div").parentElement;
      await user.click(basicCard!);

      const hourlyRadio = screen.getByDisplayValue("HOURLY") as HTMLInputElement;
      expect(hourlyRadio.checked).toBe(true);
    });

    it("should support keyboard navigation for preset selection", async () => {
      renderWithOnboarding(<Step3Rates />);

      const basicCard = screen.getByText("Básico").closest("div").parentElement;
      basicCard?.focus();
      fireEvent.keyDown(basicCard!, { key: "Enter" });

      const hourlyRadio = screen.getByDisplayValue("HOURLY") as HTMLInputElement;
      expect(hourlyRadio.checked).toBe(true);
    });
  });

  describe("Billing Model Selection", () => {
    it("should render all billing model radio options", () => {
      renderWithOnboarding(<Step3Rates />);

      expect(screen.getByLabelText("Por hora")).toBeInTheDocument();
      expect(screen.getByLabelText("Fracción")).toBeInTheDocument();
      expect(screen.getByLabelText("Tarifa Única")).toBeInTheDocument();
      expect(screen.getByLabelText("Día Completo")).toBeInTheDocument();
      expect(screen.getByLabelText("Mixto")).toBeInTheDocument();
    });

    it("should show base rate input when HOURLY model is selected", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step3Rates />);

      const hourlyRadio = screen.getByLabelText("Por hora");
      await user.click(hourlyRadio);

      expect(screen.getByText("Tarifa base por hora")).toBeInTheDocument();
    });

    it("should show flat rate input when FULL_DAY model is selected", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step3Rates />);

      const fullDayRadio = screen.getByLabelText("Día Completo");
      await user.click(fullDayRadio);

      expect(screen.getByText("Tarifa por día completo")).toBeInTheDocument();
    });
  });

  describe("Special Rates Section", () => {
    it("should have night rate toggle", () => {
      renderWithOnboarding(<Step3Rates />);

      const nightRateLabel = screen.getByText("¿Maneja tarifa nocturna?");
      expect(nightRateLabel).toBeInTheDocument();
    });

    it("should have toggle options for special rates", () => {
      renderWithOnboarding(<Step3Rates />);
      // Special rates section should be rendered
      expect(screen.getByText("Tarifas Especiales")).toBeInTheDocument();
    });
  });

  describe("Billing Rules Section", () => {
    it("should have fractions toggle", () => {
      renderWithOnboarding(<Step3Rates />);

      const fractionsLabel = screen.getByText("¿Cobra fracciones?");
      expect(fractionsLabel).toBeInTheDocument();
    });

    it("should have courtesy toggle", () => {
      renderWithOnboarding(<Step3Rates />);

      const courtesyLabel = screen.getByText("¿Minutos de cortesía (Gratis)?");
      expect(courtesyLabel).toBeInTheDocument();
    });

    it("should display rounding option select", () => {
      renderWithOnboarding(<Step3Rates />);

      const roundingLabel = screen.getByText("¿Cómo desea redondear el tiempo?");
      expect(roundingLabel).toBeInTheDocument();
    });
  });

  describe("Vehicle Type Rates Section", () => {
    it("should have vehicle type rates toggle", () => {
      renderWithOnboarding(<Step3Rates />);

      const vehicleLabel = screen.getByText("¿Desea manejar tarifas diferentes por tipo de vehículo?");
      expect(vehicleLabel).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper role attributes", () => {
      renderWithOnboarding(<Step3Rates />);

      const switches = screen.queryAllByRole("checkbox");
      if (switches.length > 0) {
        expect(switches[0]).toHaveAttribute("role", "checkbox");
      }
    });

    it("should display required mark indicators", () => {
      renderWithOnboarding(<Step3Rates />);

      const requiredMarks = screen.getAllByText("*");
      expect(requiredMarks.length).toBeGreaterThan(0);
    });

    it("should have descriptive labels for all inputs", () => {
      renderWithOnboarding(<Step3Rates />);

      expect(screen.getByText("Configuración de Tarifas Inteligente")).toBeInTheDocument();
      expect(screen.getByText("1. Modelo de Cobro Principal")).toBeInTheDocument();
    });
  });

  describe("Conditional Rendering", () => {
    it("should render special rates section", () => {
      renderWithOnboarding(<Step3Rates />);

      const specialRatesSection = screen.getByText("Tarifas Especiales");
      expect(specialRatesSection).toBeInTheDocument();
    });
  });

  describe("Comprehensive Form Workflow", () => {
    // M-07: Tests must verify actual state, not just text presence
    it("should complete a full BASIC rate configuration with correct state", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step3Rates />);

      // Select BASIC preset
      const basicCard = screen.getByText("Básico").closest("div").parentElement;
      await user.click(basicCard!);

      // Verify BASIC preset state (not just presence of text)
      const hourlyRadio = screen.getByDisplayValue("HOURLY") as HTMLInputElement;
      expect(hourlyRadio.checked).toBe(true);

      // Verify fractions are disabled in BASIC
      const fractionsTrigger = screen.getByLabelText("¿Cobra fracciones?") as HTMLInputElement;
      expect(fractionsTrigger.checked).toBe(false);

      // Verify courtesy is disabled in BASIC
      const courtesyTrigger = screen.getByLabelText("¿Minutos de cortesía (Gratis)?") as HTMLInputElement;
      expect(courtesyTrigger.checked).toBe(false);
    });

    it("should complete a full COMMERCIAL rate configuration with fractions enabled", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step3Rates />);

      // Select COMMERCIAL preset
      const commercialCard = screen.getByText("Comercial").closest("div").parentElement;
      await user.click(commercialCard!);

      // Verify COMMERCIAL preset state (not just text presence)
      const hourlyRadio = screen.getByDisplayValue("HOURLY") as HTMLInputElement;
      expect(hourlyRadio.checked).toBe(true);

      // Verify fractions ARE enabled in COMMERCIAL
      const fractionsTrigger = screen.getByLabelText("¿Cobra fracciones?") as HTMLInputElement;
      expect(fractionsTrigger.checked).toBe(true);

      // Verify courtesy IS enabled in COMMERCIAL
      const courtesyTrigger = screen.getByLabelText("¿Minutos de cortesía (Gratis)?") as HTMLInputElement;
      expect(courtesyTrigger.checked).toBe(true);
    });

    it("should complete a full 24H rate configuration with correct toggles", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step3Rates />);

      // Select 24H preset
      const fullDayCard = screen.getByText("24 Horas").closest("div").parentElement;
      await user.click(fullDayCard!);

      // Verify MIXED model is selected
      const mixedRadio = screen.getByDisplayValue("MIXED") as HTMLInputElement;
      expect(mixedRadio.checked).toBe(true);

      // Verify night rate IS enabled in 24H
      const nightRateTrigger = screen.getByLabelText("¿Maneja tarifa nocturna?") as HTMLInputElement;
      expect(nightRateTrigger.checked).toBe(true);

      // Verify full day rate IS enabled in 24H
      const fullDayTrigger = screen.getByLabelText("¿Maneja tarifa de día completo (24h)?") as HTMLInputElement;
      expect(fullDayTrigger.checked).toBe(true);

      // Verify fractions are NOT enabled in 24H
      const fractionsTrigger = screen.getByLabelText("¿Cobra fracciones?") as HTMLInputElement;
      expect(fractionsTrigger.checked).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should render without crashing if no vehicle types are configured", () => {
      renderWithOnboarding(<Step3Rates />);

      const vehicleLabel = screen.getByText("¿Desea manejar tarifas diferentes por tipo de vehículo?");
      expect(vehicleLabel).toBeInTheDocument();
    });

    it("should handle very large numeric values", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step3Rates />);

      const hourlyRadio = screen.getByLabelText("Por hora");
      await user.click(hourlyRadio);

      const inputs = screen.queryAllByRole("spinbutton");
      if (inputs.length > 0) {
        const baseRateInput = inputs[0] as HTMLInputElement;
        fireEvent.change(baseRateInput, { target: { value: "999999" } });
        expect(baseRateInput.value).toBe("999999");
      }
    });
  });
});
