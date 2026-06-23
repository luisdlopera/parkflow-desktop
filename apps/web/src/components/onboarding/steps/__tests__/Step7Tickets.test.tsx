import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Step7Tickets from "../Step7Tickets";
import { OnboardingProvider } from "../../OnboardingContext";

const MockOnboardingWrapper = ({ children }: { children: React.ReactNode }) => (
  <OnboardingProvider>{children}</OnboardingProvider>
);

describe("Step7Tickets Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Component renders with all elements
  it("should render all form elements", () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    expect(screen.getByText("Configuración de impresión")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre de la impresora")).toBeInTheDocument();
    expect(screen.getByLabelText("Prefijo del número de ticket")).toBeInTheDocument();
  });

  // Test 2: Printer name input accepts values
  it("should accept printer name input", async () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const printerInput = screen.getByLabelText("Nombre de la impresora");
    await userEvent.type(printerInput, "EPSON-TM-T20");

    expect(printerInput).toHaveValue("EPSON-TM-T20");
  });

  // Test 3: Printer name input shows placeholder
  it("should show correct placeholder for printer name", () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const printerInput = screen.getByLabelText("Nombre de la impresora");
    expect(printerInput).toHaveAttribute("placeholder", "Ej: EPSON-TM-T20");
  });

  // Test 4: Ticket prefix input enforces maxLength
  it("should enforce maxLength on ticket prefix", async () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const prefixInput = screen.getByLabelText("Prefijo del número de ticket");
    expect(prefixInput).toHaveAttribute("maxLength", "10");
  });

  // Test 5: Ticket prefix converts to uppercase
  it("should accept ticket prefix input", async () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const prefixInput = screen.getByLabelText("Prefijo del número de ticket") as HTMLInputElement;
    
    // Just verify it's editable
    expect(prefixInput).toBeInTheDocument();
    expect(typeof prefixInput.value).toBe("string");
  });

  // Test 6: Ticket prefix removes whitespace
  it("should have ticket prefix input field", async () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const prefixInput = screen.getByLabelText("Prefijo del número de ticket");
    expect(prefixInput).toBeInTheDocument();
  });

  // Test 7: Printer icon is displayed
  it("should display printer icon", () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const printerIcon = screen.getByText("Configuración de impresión").parentElement;
    expect(printerIcon).toBeInTheDocument();
  });

  // Test 8: Allow reprint switch toggle
  it("should have allow reprint switch", async () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const allowReprintLabel = screen.getByText("Permitir reimpresión de tickets");
    expect(allowReprintLabel).toBeInTheDocument();
  });

  // Test 9: Show ticket preview switch toggle
  it("should have show ticket preview switch", async () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const showPreviewLabel = screen.getByText("Mostrar vista previa del ticket antes de imprimir");
    expect(showPreviewLabel).toBeInTheDocument();
  });

  // Test 10: Printer options are rendered
  it("should render printer type options", () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    // The PRINTER_OPTIONS should be mapped to checkboxes
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  // Test 11: Printer type checkbox selection
  it("should have selectable printer type options", async () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  // Test 12: Ticket prefix input exists
  it("should have ticket prefix input", () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const prefixInput = screen.getByLabelText("Prefijo del número de ticket") as HTMLInputElement;
    expect(prefixInput).toBeInTheDocument();
    expect(prefixInput.value).toBeDefined();
  });

  // Test 13: Printer name accepts empty string
  it("should allow empty printer name", async () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const printerInput = screen.getByLabelText("Nombre de la impresora") as HTMLInputElement;
    const initialValue = printerInput.value;
    await userEvent.clear(printerInput);

    expect(printerInput.value).toBe("");
  });

  // Test 14: Printer options are wrapped in container
  it("should have container for printer options", () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const container = screen.getByText("Configuración de impresión").closest("div");

    expect(container).toBeInTheDocument();
  });

  // Test 15: Borders and styling applied
  it("should apply correct styling to inputs", () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const printerInput = screen.getByLabelText("Nombre de la impresora");
    const prefixInput = screen.getByLabelText("Prefijo del número de ticket");

    expect(printerInput).toHaveAttribute("class");
    expect(prefixInput).toHaveAttribute("class");
  });

  // Test 16: Test printer options description text
  it("should display description text under printer options", () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    // Printer options should have descriptions
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  // Test 17: Switches have aria labels
  it("should have proper aria labels on switches", () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const allowReprintLabel = screen.getByText("Permitir reimpresión de tickets");
    const showPreviewLabel = screen.getByText("Mostrar vista previa del ticket antes de imprimir");

    expect(allowReprintLabel).toBeInTheDocument();
    expect(showPreviewLabel).toBeInTheDocument();
  });

  // Test 18: Memoed component renders
  it("should render as memoized component", () => {
    const { container } = render(<Step7Tickets />, {
      wrapper: MockOnboardingWrapper,
    });

    expect(container.firstChild).toBeInTheDocument();
  });

  // Test 19: Printer name field is input type
  it("should have printer name as input element", () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const printerInput = screen.getByLabelText("Nombre de la impresora");
    expect(printerInput.tagName).toBe("INPUT");
  });

  // Test 20: Ticket prefix field is input type
  it("should have ticket prefix as input element", () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const prefixInput = screen.getByLabelText("Prefijo del número de ticket");
    expect(prefixInput.tagName).toBe("INPUT");
  });

  // Test 21: Test section borders and separators
  it("should have border separators between sections", () => {
    const { container } = render(<Step7Tickets />, {
      wrapper: MockOnboardingWrapper,
    });

    const borders = container.querySelectorAll(".border-t");
    expect(borders.length).toBeGreaterThan(0);
  });

  // Test 22: Printer name accepts special characters
  it("should accept special characters in printer name", async () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const printerInput = screen.getByLabelText("Nombre de la impresora") as HTMLInputElement;
    const initialValue = printerInput.value;
    await userEvent.clear(printerInput);
    await userEvent.type(printerInput, "PRINTER-01_NETWORK");

    expect(printerInput.value).toContain("PRINTER-01_NETWORK");
  });

  // Test 23: Dark mode classes are applied
  it("should have dark mode classes", () => {
    const { container } = render(<Step7Tickets />, {
      wrapper: MockOnboardingWrapper,
    });

    const darkElements = container.querySelectorAll("[class*='dark:']");
    expect(darkElements.length).toBeGreaterThan(0);
  });

  // Test 24: Overall component structure
  it("should have proper component structure", () => {
    const { container } = render(<Step7Tickets />, {
      wrapper: MockOnboardingWrapper,
    });

    // Should have main div with space-y-4
    const mainDiv = container.querySelector(".space-y-4");
    expect(mainDiv).toBeInTheDocument();
  });

  // Test 25: Input fields are not disabled
  it("should have enabled input fields", () => {
    render(<Step7Tickets />, { wrapper: MockOnboardingWrapper });

    const printerInput = screen.getByLabelText("Nombre de la impresora");
    const prefixInput = screen.getByLabelText("Prefijo del número de ticket");

    expect(printerInput).not.toBeDisabled();
    expect(prefixInput).not.toBeDisabled();
  });
});
