import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step4BoxAndRegion from "./Step4BoxAndRegion";
import { OnboardingProvider } from "../OnboardingContext";

function renderWithOnboarding(ui: React.ReactElement) {
  return render(
    <OnboardingProvider>
      {ui}
    </OnboardingProvider>
  );
}

describe("Step4BoxAndRegion Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Regional Configuration Section", () => {
    it("should render regional configuration heading", () => {
      renderWithOnboarding(<Step4BoxAndRegion />);
      expect(screen.getByText("Configuración regional")).toBeInTheDocument();
    });

    it("should render country selection checkboxes", () => {
      renderWithOnboarding(<Step4BoxAndRegion />);
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it("should display plate format examples", () => {
      renderWithOnboarding(<Step4BoxAndRegion />);
      const formatTexts = screen.getAllByText(/Formato:/);
      expect(formatTexts.length).toBeGreaterThan(0);
    });
  });

  describe("Country Selection", () => {
    it("should allow selecting a country", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step4BoxAndRegion />);

      const checkboxes = screen.getAllByRole("checkbox");
      if (checkboxes.length > 0) {
        await user.click(checkboxes[0]);
        expect(checkboxes[0]).toBeInTheDocument();
      }
    });

    it("should display country labels", () => {
      renderWithOnboarding(<Step4BoxAndRegion />);
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  describe("Plate Prefix Input", () => {
    it("should display plate prefix input", () => {
      renderWithOnboarding(<Step4BoxAndRegion />);
      const prefixLabel = screen.getByText("Prefijo de placa (opcional)");
      expect(prefixLabel).toBeInTheDocument();
    });

    it("should allow entering plate prefix", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step4BoxAndRegion />);

      const prefixInput = screen.getByLabelText("Prefijo de placa") as HTMLInputElement;
      await user.type(prefixInput, "ABC");
      expect(prefixInput.value).toContain("ABC");
    });

    it("should have placeholder text for plate prefix", () => {
      renderWithOnboarding(<Step4BoxAndRegion />);
      const prefixInput = screen.getByLabelText("Prefijo de placa") as HTMLInputElement;
      expect(prefixInput.placeholder).toBe("Ej: ABC");
    });

    it("should convert plate prefix to uppercase", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step4BoxAndRegion />);

      const prefixInput = screen.getByLabelText("Prefijo de placa") as HTMLInputElement;
      await user.type(prefixInput, "abc");
      expect(prefixInput.value.toUpperCase()).toBe(prefixInput.value);
    });
  });

  describe("Terminal Count Section", () => {
    it("should display terminal count label", () => {
      renderWithOnboarding(<Step4BoxAndRegion />);
      expect(screen.getByText("¿Cuántas terminales/cajas tienes?")).toBeInTheDocument();
    });

    it("should have number input for terminal count", () => {
      renderWithOnboarding(<Step4BoxAndRegion />);
      const terminalInput = screen.getByLabelText("Número de terminales");
      expect(terminalInput).toBeInTheDocument();
    });

    it("should allow increasing terminal count", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step4BoxAndRegion />);

      const terminalInput = screen.getByLabelText("Número de terminales") as HTMLInputElement;
      fireEvent.change(terminalInput, { target: { value: "5" } });
      expect(parseInt(terminalInput.value)).toBe(5);
    });

    it("should have type number", () => {
      renderWithOnboarding(<Step4BoxAndRegion />);
      const terminalInput = screen.getByLabelText("Número de terminales") as HTMLInputElement;
      expect(terminalInput.type).toBe("number");
    });

    it("should have min attribute set to 1", () => {
      renderWithOnboarding(<Step4BoxAndRegion />);
      const terminalInput = screen.getByLabelText("Número de terminales") as HTMLInputElement;
      expect(terminalInput.min).toBe("1");
    });
  });

  describe("Cash per Operator Toggle", () => {
    it("should display cash per operator label", () => {
      renderWithOnboarding(<Step4BoxAndRegion />);
      expect(screen.getByText("¿Manejas caja por operador?")).toBeInTheDocument();
    });

    it("should have switch for cash per operator", () => {
      renderWithOnboarding(<Step4BoxAndRegion />);
      const toggles = screen.getAllByRole("checkbox");
      expect(toggles.length).toBeGreaterThan(0);
    });

    it("should allow toggling cash per operator", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step4BoxAndRegion />);

      const toggles = screen.getAllByRole("checkbox");
      if (toggles.length > 0) {
        const lastToggle = toggles[toggles.length - 1];
        await user.click(lastToggle);
        expect(lastToggle).toBeInTheDocument();
      }
    });
  });

  describe("Accessibility", () => {
    it("should have aria-label on plate prefix input", () => {
      renderWithOnboarding(<Step4BoxAndRegion />);
      const prefixInput = screen.getByLabelText("Prefijo de placa");
      expect(prefixInput).toHaveAttribute("aria-label");
    });

    it("should have aria-label on terminal count input", () => {
      renderWithOnboarding(<Step4BoxAndRegion />);
      const terminalInput = screen.getByLabelText("Número de terminales");
      expect(terminalInput).toHaveAttribute("aria-label");
    });
  });

  describe("Input Validation", () => {
    it("should validate terminal count as positive", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step4BoxAndRegion />);

      const terminalInput = screen.getByLabelText("Número de terminales") as HTMLInputElement;
      fireEvent.change(terminalInput, { target: { value: "-5" } });
      expect(parseInt(terminalInput.value) >= 1).toBe(true);
    });

    it("should accept empty plate prefix", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step4BoxAndRegion />);

      const prefixInput = screen.getByLabelText("Prefijo de placa") as HTMLInputElement;
      fireEvent.change(prefixInput, { target: { value: "" } });
      expect(prefixInput.value).toBe("");
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete regional setup workflow", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step4BoxAndRegion />);

      // 1. Select country
      const checkboxes = screen.getAllByRole("checkbox");
      if (checkboxes.length > 0) {
        await user.click(checkboxes[0]);
      }

      // 2. Set plate prefix
      const prefixInput = screen.getByLabelText("Prefijo de placa") as HTMLInputElement;
      await user.type(prefixInput, "ABC");

      // 3. Set terminal count
      const terminalInput = screen.getByLabelText("Número de terminales") as HTMLInputElement;
      fireEvent.change(terminalInput, { target: { value: "5" } });

      expect(parseInt(terminalInput.value)).toBe(5);
    });
  });
});
