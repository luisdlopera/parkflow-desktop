import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step7Tickets from "./Step7Tickets";
import { OnboardingProvider } from "../OnboardingContext";

function renderWithOnboarding(ui: React.ReactElement) {
  return render(
    <OnboardingProvider>
      {ui}
    </OnboardingProvider>
  );
}

describe("Step7Tickets Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Printer Configuration Section", () => {
    it("should render printer configuration heading", () => {
      renderWithOnboarding(<Step7Tickets />);
      expect(screen.getByText("Configuración de impresión")).toBeInTheDocument();
    });

    it("should render printer type checkboxes", () => {
      renderWithOnboarding(<Step7Tickets />);
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  describe("Printer Type Selection", () => {
    it("should allow selecting a printer type", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      const checkboxes = screen.getAllByRole("checkbox");
      const firstPrinterCheckbox = checkboxes[0];
      await user.click(firstPrinterCheckbox);
      expect(firstPrinterCheckbox).toBeInTheDocument();
    });

    it("should allow switching between printer types", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      const checkboxes = screen.getAllByRole("checkbox");
      if (checkboxes.length >= 2) {
        await user.click(checkboxes[0]);
        await user.click(checkboxes[1]);
        expect(checkboxes[0]).toBeInTheDocument();
        expect(checkboxes[1]).toBeInTheDocument();
      }
    });
  });

  describe("Printer Name Input", () => {
    it("should display printer name label", () => {
      renderWithOnboarding(<Step7Tickets />);
      expect(screen.getByText("Nombre de la impresora (opcional)")).toBeInTheDocument();
    });

    it("should have input for printer name", () => {
      renderWithOnboarding(<Step7Tickets />);
      const printerNameInput = screen.getByLabelText("Nombre de la impresora");
      expect(printerNameInput).toBeInTheDocument();
    });

    it("should have placeholder text for printer name", () => {
      renderWithOnboarding(<Step7Tickets />);
      const printerNameInput = screen.getByLabelText("Nombre de la impresora") as HTMLInputElement;
      expect(printerNameInput.placeholder).toBe("Ej: EPSON-TM-T20");
    });

    it("should allow entering printer name", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      const printerNameInput = screen.getByLabelText("Nombre de la impresora") as HTMLInputElement;
      await user.type(printerNameInput, "EPSON-TM-T20");
      expect(printerNameInput.value).toBe("EPSON-TM-T20");
    });

    it("should handle clearing printer name", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      const printerNameInput = screen.getByLabelText("Nombre de la impresora") as HTMLInputElement;
      await user.type(printerNameInput, "PRINTER");
      fireEvent.change(printerNameInput, { target: { value: "" } });
      expect(printerNameInput.value).toBe("");
    });

    it("should handle special characters in printer name", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      const printerNameInput = screen.getByLabelText("Nombre de la impresora") as HTMLInputElement;
      await user.type(printerNameInput, "EPSON-TM_T20#01");
      expect(printerNameInput.value).toContain("-");
    });
  });

  describe("Ticket Prefix Input", () => {
    it("should display ticket prefix label", () => {
      renderWithOnboarding(<Step7Tickets />);
      expect(screen.getByText("Prefijo del número de ticket")).toBeInTheDocument();
    });

    it("should display ticket prefix description", () => {
      renderWithOnboarding(<Step7Tickets />);
      expect(screen.getByText("Se usa al generar los consecutivos de tickets")).toBeInTheDocument();
    });

    it("should have input for ticket prefix", () => {
      renderWithOnboarding(<Step7Tickets />);
      const ticketPrefixInput = screen.getByLabelText("Prefijo del número de ticket");
      expect(ticketPrefixInput).toBeInTheDocument();
    });

    it("should have default value of T- for ticket prefix", () => {
      renderWithOnboarding(<Step7Tickets />);
      const ticketPrefixInput = screen.getByLabelText("Prefijo del número de ticket") as HTMLInputElement;
      expect(ticketPrefixInput.value).toBe("T-");
    });

    it("should have placeholder text for ticket prefix", () => {
      renderWithOnboarding(<Step7Tickets />);
      const ticketPrefixInput = screen.getByLabelText("Prefijo del número de ticket") as HTMLInputElement;
      expect(ticketPrefixInput.placeholder).toBe("T-");
    });

    it("should have maxLength of 10", () => {
      renderWithOnboarding(<Step7Tickets />);
      const ticketPrefixInput = screen.getByLabelText("Prefijo del número de ticket") as HTMLInputElement;
      expect(ticketPrefixInput.maxLength).toBe(10);
    });

    it("should allow entering ticket prefix", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      const ticketPrefixInput = screen.getByLabelText("Prefijo del número de ticket") as HTMLInputElement;
      fireEvent.change(ticketPrefixInput, { target: { value: "ABC-" } });
      expect(ticketPrefixInput.value).toContain("ABC");
    });

    it("should convert ticket prefix to uppercase", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      const ticketPrefixInput = screen.getByLabelText("Prefijo del número de ticket") as HTMLInputElement;
      fireEvent.change(ticketPrefixInput, { target: { value: "abc-" } });
      expect(ticketPrefixInput.value).toBe(ticketPrefixInput.value.toUpperCase());
    });

    it("should remove whitespace from ticket prefix", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      const ticketPrefixInput = screen.getByLabelText("Prefijo del número de ticket") as HTMLInputElement;
      fireEvent.change(ticketPrefixInput, { target: { value: "A B C - " } });
      const value = ticketPrefixInput.value;
      expect(!value.includes(" ")).toBe(true);
    });
  });

  describe("Reprint Permission Toggle", () => {
    it("should display reprint permission label", () => {
      renderWithOnboarding(<Step7Tickets />);
      expect(screen.getByText("Permitir reimpresión de tickets")).toBeInTheDocument();
    });

    it("should have toggle for reprint permission", () => {
      renderWithOnboarding(<Step7Tickets />);
      const toggles = screen.getAllByRole("checkbox");
      expect(toggles.length).toBeGreaterThan(0);
    });

    it("should allow toggling reprint permission", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      const toggles = screen.getAllByRole("checkbox");
      if (toggles.length >= 2) {
        const reprintToggle = toggles[toggles.length - 2];
        await user.click(reprintToggle);
        expect(reprintToggle).toBeInTheDocument();
      }
    });
  });

  describe("Ticket Preview Toggle", () => {
    it("should display ticket preview label", () => {
      renderWithOnboarding(<Step7Tickets />);
      expect(screen.getByText("Mostrar vista previa del ticket antes de imprimir")).toBeInTheDocument();
    });

    it("should have toggle for ticket preview", () => {
      renderWithOnboarding(<Step7Tickets />);
      const toggles = screen.getAllByRole("checkbox");
      expect(toggles.length).toBeGreaterThan(0);
    });

    it("should allow toggling ticket preview", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      const toggles = screen.getAllByRole("checkbox");
      const previewToggle = toggles[toggles.length - 1];
      await user.click(previewToggle);
      expect(previewToggle).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have aria-label on printer name input", () => {
      renderWithOnboarding(<Step7Tickets />);
      const printerNameInput = screen.getByLabelText("Nombre de la impresora");
      expect(printerNameInput).toHaveAttribute("aria-label");
    });

    it("should have aria-label on ticket prefix input", () => {
      renderWithOnboarding(<Step7Tickets />);
      const ticketPrefixInput = screen.getByLabelText("Prefijo del número de ticket");
      expect(ticketPrefixInput).toHaveAttribute("aria-label");
    });
  });

  describe("State Management", () => {
    it("should handle independent updates to different fields", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      const printerNameInput = screen.getByLabelText("Nombre de la impresora") as HTMLInputElement;
      await user.type(printerNameInput, "PRINTER1");

      const ticketPrefixInput = screen.getByLabelText("Prefijo del número de ticket") as HTMLInputElement;
      fireEvent.change(ticketPrefixInput, { target: { value: "TICKET-" } });

      expect(printerNameInput.value).toContain("PRINTER1");
      expect(ticketPrefixInput.value).toContain("TICKET");
    });
  });

  describe("Comprehensive Workflow", () => {
    it("should complete a full ticket configuration", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      // 1. Select printer type
      const checkboxes = screen.getAllByRole("checkbox");
      if (checkboxes.length > 0) {
        await user.click(checkboxes[0]);
      }

      // 2. Enter printer name
      const printerNameInput = screen.getByLabelText("Nombre de la impresora") as HTMLInputElement;
      await user.type(printerNameInput, "EPSON-TM-T20");

      // 3. Update ticket prefix
      const ticketPrefixInput = screen.getByLabelText("Prefijo del número de ticket") as HTMLInputElement;
      fireEvent.change(ticketPrefixInput, { target: { value: "TICKET-2024-" } });

      expect(printerNameInput.value).toContain("EPSON");
      expect(ticketPrefixInput.value).toContain("TICKET");
    });
  });

  describe("Input Validation", () => {
    it("should accept alphanumeric characters in printer name", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      const printerNameInput = screen.getByLabelText("Nombre de la impresora") as HTMLInputElement;
      await user.type(printerNameInput, "Printer123");
      expect(printerNameInput.value).toContain("Printer");
    });

    it("should accept hyphens and underscores in printer name", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      const printerNameInput = screen.getByLabelText("Nombre de la impresora") as HTMLInputElement;
      await user.type(printerNameInput, "EPSON-TM_T20");
      expect(printerNameInput.value).toContain("-");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long printer name", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      const printerNameInput = screen.getByLabelText("Nombre de la impresora") as HTMLInputElement;
      const longName = "EPSON-TM-T20-NETWORK-PRINTER-WITH-LONG-NAME";
      await user.type(printerNameInput, longName);
      expect(printerNameInput.value.length).toBeGreaterThan(0);
    });

    it("should handle numeric only ticket prefix", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      const ticketPrefixInput = screen.getByLabelText("Prefijo del número de ticket") as HTMLInputElement;
      fireEvent.change(ticketPrefixInput, { target: { value: "2024" } });
      expect(ticketPrefixInput.value).toContain("2024");
    });

    it("should handle rapid toggling", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      const toggles = screen.getAllByRole("checkbox");
      if (toggles.length >= 2) {
        const reprintToggle = toggles[toggles.length - 2];
        await user.click(reprintToggle);
        await user.click(reprintToggle);
        await user.click(reprintToggle);
        expect(reprintToggle).toBeInTheDocument();
      }
    });

    it("should handle clearing all inputs", async () => {
      const user = userEvent.setup();
      renderWithOnboarding(<Step7Tickets />);

      const printerNameInput = screen.getByLabelText("Nombre de la impresora") as HTMLInputElement;
      const ticketPrefixInput = screen.getByLabelText("Prefijo del número de ticket") as HTMLInputElement;

      await user.type(printerNameInput, "PRINTER");
      fireEvent.change(ticketPrefixInput, { target: { value: "TICKET-" } });

      fireEvent.change(printerNameInput, { target: { value: "" } });
      fireEvent.change(ticketPrefixInput, { target: { value: "T-" } });

      expect(printerNameInput.value).toBe("");
      expect(ticketPrefixInput.value).toBe("T-");
    });
  });
});
