import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step6PaymentMethods from "./Step6PaymentMethods";
import * as OnboardingContext from "../OnboardingContext";

vi.mock("../OnboardingContext", () => ({
  useOnboardingData: vi.fn(),
  useOnboardingMetadata: vi.fn(),
}));

vi.mock("../QuestionHelp", () => ({
  default: ({ title, children }: any) => (
    <div data-testid="question-help" title={title}>
      {children}
    </div>
  ),
}));

vi.mock("@/lib/payment-method-catalog", () => ({
  PAYMENT_OPTIONS_FOR_ONBOARDING: [
    { code: "CASH", label: "Efectivo" },
    { code: "DEBIT_CARD", label: "Tarjeta Débito" },
    { code: "CREDIT_CARD", label: "Tarjeta Crédito" },
    { code: "QR", label: "Código QR" },
    { code: "TRANSFER", label: "Transferencia Bancaria" },
    { code: "NEQUI", label: "Nequi" },
  ],
}));

describe("Step6PaymentMethods", () => {
  const mockSetStepData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          paymentMethods: [],
        },
        setStepData: mockSetStepData,
        stepErrors: {},
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        status: {
          availableOptionsByPlan: {
            paymentMethods: ["CASH", "DEBIT_CARD", "CREDIT_CARD", "QR", "TRANSFER", "NEQUI"],
          },
        },
      } as any);
    });

    it("should render question text", () => {
      render(<Step6PaymentMethods />);
      expect(screen.getByText("¿Qué métodos de pago aceptas?")).toBeInTheDocument();
    });

    it("should render required mark", () => {
      render(<Step6PaymentMethods />);
      const requiredMark = screen.getByText("*");
      expect(requiredMark).toBeInTheDocument();
      expect(requiredMark).toHaveClass("text-danger");
    });

    it("should render QuestionHelp component", () => {
      render(<Step6PaymentMethods />);
      expect(screen.getByTestId("question-help")).toBeInTheDocument();
    });

    it("should render all available payment method options", () => {
      render(<Step6PaymentMethods />);
      expect(screen.getByRole("checkbox", { name: /Efectivo/i })).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: /Tarjeta Débito/i })).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: /Tarjeta Crédito/i })).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: /Código QR/i })).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: /Transferencia Bancaria/i })).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: /Nequi/i })).toBeInTheDocument();
    });

    it("should render checkboxes in 2-column grid on sm screens and up", () => {
      const { container } = render(<Step6PaymentMethods />);
      const grid = container.querySelector(".grid.gap-3.sm\\:grid-cols-2");
      expect(grid).toBeInTheDocument();
    });

    it("should have space-y-4 container", () => {
      const { container } = render(<Step6PaymentMethods />);
      const container_el = container.querySelector(".space-y-4");
      expect(container_el).toBeInTheDocument();
    });
  });

  describe("no available payment methods", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          paymentMethods: [],
        },
        setStepData: mockSetStepData,
        stepErrors: {},
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        status: {
          availableOptionsByPlan: {
            paymentMethods: [], // Empty list - no payment methods available
          },
        },
      } as any);
    });

    it("should display message when no payment methods are available", () => {
      render(<Step6PaymentMethods />);
      expect(
        screen.getByText("No hay métodos de pago disponibles en el catálogo base.")
      ).toBeInTheDocument();
    });

    it("should not render checkboxes when no methods available", () => {
      render(<Step6PaymentMethods />);
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });
  });

  describe("payment method filtering by plan", () => {
    it("should filter payment methods based on availableOptionsByPlan", () => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          paymentMethods: [],
        },
        setStepData: mockSetStepData,
        stepErrors: {},
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        status: {
          availableOptionsByPlan: {
            paymentMethods: ["CASH", "DEBIT_CARD"], // Only allow 2 methods
          },
        },
      } as any);

      render(<Step6PaymentMethods />);
      expect(screen.getByRole("checkbox", { name: /Efectivo/i })).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: /Tarjeta Débito/i })).toBeInTheDocument();
      expect(screen.queryByRole("checkbox", { name: /Tarjeta Crédito/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("checkbox", { name: /Código QR/i })).not.toBeInTheDocument();
    });

    it("should show all methods when availableOptionsByPlan is undefined", () => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          paymentMethods: [],
        },
        setStepData: mockSetStepData,
        stepErrors: {},
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        status: {
          availableOptionsByPlan: {
            paymentMethods: undefined, // No restriction
          },
        },
      } as any);

      render(<Step6PaymentMethods />);
      expect(screen.getByRole("checkbox", { name: /Efectivo/i })).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: /Tarjeta Crédito/i })).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: /Código QR/i })).toBeInTheDocument();
    });
  });

  describe("checkbox selection", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          paymentMethods: [],
        },
        setStepData: mockSetStepData,
        stepErrors: {},
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        status: {
          availableOptionsByPlan: {
            paymentMethods: ["CASH", "DEBIT_CARD", "CREDIT_CARD", "QR", "TRANSFER", "NEQUI"],
          },
        },
      } as any);
    });

    it("should call setStepData when checkbox is selected", async () => {
      const user = userEvent.setup();
      render(<Step6PaymentMethods />);

      const cashCheckbox = screen.getByRole("checkbox", { name: /Efectivo/i });
      await user.click(cashCheckbox);

      expect(mockSetStepData).toHaveBeenCalledWith({
        paymentMethods: ["CASH"],
      });
    });

    it("should add payment method to list when checked", async () => {
      const user = userEvent.setup();
      render(<Step6PaymentMethods />);

      const cashCheckbox = screen.getByRole("checkbox", { name: /Efectivo/i });
      await user.click(cashCheckbox);

      expect(mockSetStepData).toHaveBeenCalledWith({
        paymentMethods: ["CASH"],
      });
    });

    it("should handle selecting cash checkbox", async () => {
      const user = userEvent.setup();
      render(<Step6PaymentMethods />);

      const cashCheckbox = screen.getByRole("checkbox", { name: /Efectivo/i });
      await user.click(cashCheckbox);

      expect(mockSetStepData).toHaveBeenCalledWith({
        paymentMethods: ["CASH"],
      });
    });
  });

  describe("checkbox deselection", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          paymentMethods: ["CASH", "DEBIT_CARD", "CREDIT_CARD"],
        },
        setStepData: mockSetStepData,
        stepErrors: {},
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        status: {
          availableOptionsByPlan: {
            paymentMethods: ["CASH", "DEBIT_CARD", "CREDIT_CARD", "QR", "TRANSFER", "NEQUI"],
          },
        },
      } as any);
    });

    it("should remove payment method when unchecked", async () => {
      const user = userEvent.setup();
      render(<Step6PaymentMethods />);

      const debitCheckbox = screen.getByRole("checkbox", { name: /Tarjeta Débito/i });
      await user.click(debitCheckbox);

      expect(mockSetStepData).toHaveBeenCalledWith({
        paymentMethods: ["CASH", "CREDIT_CARD"],
      });
    });

    it("should properly update list when removing first item", async () => {
      const user = userEvent.setup();
      render(<Step6PaymentMethods />);

      const cashCheckbox = screen.getByRole("checkbox", { name: /Efectivo/i });
      await user.click(cashCheckbox);

      expect(mockSetStepData).toHaveBeenCalledWith({
        paymentMethods: ["DEBIT_CARD", "CREDIT_CARD"],
      });
    });

    it("should add payment method when unchecked item is re-selected", async () => {
      const user = userEvent.setup();
      render(<Step6PaymentMethods />);

      const qrCheckbox = screen.getByRole("checkbox", { name: /Código QR/i });
      await user.click(qrCheckbox);

      expect(mockSetStepData).toHaveBeenCalledWith({
        paymentMethods: ["CASH", "DEBIT_CARD", "CREDIT_CARD", "QR"],
      });
    });
  });

  describe("checked state of checkboxes", () => {
    it("should show selected payment methods as checked", () => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          paymentMethods: ["CASH", "CREDIT_CARD"],
        },
        setStepData: mockSetStepData,
        stepErrors: {},
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        status: {
          availableOptionsByPlan: {
            paymentMethods: ["CASH", "DEBIT_CARD", "CREDIT_CARD", "QR", "TRANSFER", "NEQUI"],
          },
        },
      } as any);

      render(<Step6PaymentMethods />);

      const cashCheckbox = screen.getByRole("checkbox", { name: /Efectivo/i }) as HTMLInputElement;
      const debitCheckbox = screen.getByRole("checkbox", { name: /Tarjeta Débito/i }) as HTMLInputElement;
      const creditCheckbox = screen.getByRole("checkbox", { name: /Tarjeta Crédito/i }) as HTMLInputElement;

      expect(cashCheckbox.checked).toBe(true);
      expect(debitCheckbox.checked).toBe(false);
      expect(creditCheckbox.checked).toBe(true);
    });

    it("should show unselected payment methods as unchecked", () => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          paymentMethods: [],
        },
        setStepData: mockSetStepData,
        stepErrors: {},
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        status: {
          availableOptionsByPlan: {
            paymentMethods: ["CASH", "DEBIT_CARD", "CREDIT_CARD"],
          },
        },
      } as any);

      render(<Step6PaymentMethods />);

      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect((checkbox as HTMLInputElement).checked).toBe(false);
      });
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          paymentMethods: [],
        },
        setStepData: mockSetStepData,
        stepErrors: {
          paymentMethods: "Debes seleccionar al menos un método de pago",
        },
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        status: {
          availableOptionsByPlan: {
            paymentMethods: ["CASH", "DEBIT_CARD", "CREDIT_CARD"],
          },
        },
      } as any);
    });

    it("should display error message when present", () => {
      render(<Step6PaymentMethods />);
      expect(
        screen.getByText("Debes seleccionar al menos un método de pago")
      ).toBeInTheDocument();
    });

    it("should render error with role alert", () => {
      render(<Step6PaymentMethods />);
      const errorMessage = screen.getByRole("alert");
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveClass("text-xs");
      expect(errorMessage).toHaveClass("text-danger");
    });

    it("should not display error when stepErrors is empty", () => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          paymentMethods: ["CASH"],
        },
        setStepData: mockSetStepData,
        stepErrors: {},
      } as any);

      render(<Step6PaymentMethods />);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("non-array payment methods", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          paymentMethods: undefined, // Not an array
        },
        setStepData: mockSetStepData,
        stepErrors: {},
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        status: {
          availableOptionsByPlan: {
            paymentMethods: ["CASH", "DEBIT_CARD", "CREDIT_CARD"],
          },
        },
      } as any);
    });

    it("should handle undefined paymentMethods gracefully", () => {
      render(<Step6PaymentMethods />);
      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect((checkbox as HTMLInputElement).checked).toBe(false);
      });
    });

    it("should treat non-array as empty when converting to array", async () => {
      const user = userEvent.setup();
      render(<Step6PaymentMethods />);

      const cashCheckbox = screen.getByRole("checkbox", { name: /Efectivo/i });
      await user.click(cashCheckbox);

      expect(mockSetStepData).toHaveBeenCalledWith({
        paymentMethods: ["CASH"],
      });
    });
  });

  describe("rapid checkbox changes", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          paymentMethods: [],
        },
        setStepData: mockSetStepData,
        stepErrors: {},
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        status: {
          availableOptionsByPlan: {
            paymentMethods: ["CASH", "DEBIT_CARD", "CREDIT_CARD"],
          },
        },
      } as any);
    });

    it("should handle selecting cash checkbox multiple times", async () => {
      const user = userEvent.setup();
      render(<Step6PaymentMethods />);

      const cashCheckbox = screen.getByRole("checkbox", { name: /Efectivo/i });

      await user.click(cashCheckbox);

      expect(mockSetStepData).toHaveBeenCalledWith({
        paymentMethods: ["CASH"],
      });
    });
  });

  describe("component memoization", () => {
    it("should render without errors on remount", () => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          paymentMethods: ["CASH"],
        },
        setStepData: mockSetStepData,
        stepErrors: {},
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        status: {
          availableOptionsByPlan: {
            paymentMethods: ["CASH", "DEBIT_CARD", "CREDIT_CARD"],
          },
        },
      } as any);

      const { rerender } = render(<Step6PaymentMethods />);
      expect(screen.getByText("¿Qué métodos de pago aceptas?")).toBeInTheDocument();

      rerender(<Step6PaymentMethods />);
      expect(screen.getByText("¿Qué métodos de pago aceptas?")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          paymentMethods: [],
        },
        setStepData: mockSetStepData,
        stepErrors: {},
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        status: {
          availableOptionsByPlan: {
            paymentMethods: ["CASH", "DEBIT_CARD", "CREDIT_CARD"],
          },
        },
      } as any);
    });

    it("should have all checkboxes accessible", () => {
      render(<Step6PaymentMethods />);
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it("should have question header with proper structure", () => {
      render(<Step6PaymentMethods />);
      const questionText = screen.getByText("¿Qué métodos de pago aceptas?");
      expect(questionText).toBeInTheDocument();
      expect(questionText.parentElement).toHaveClass("flex");
      expect(questionText.parentElement).toHaveClass("items-center");
      expect(questionText.parentElement).toHaveClass("gap-2");
    });
  });
});
