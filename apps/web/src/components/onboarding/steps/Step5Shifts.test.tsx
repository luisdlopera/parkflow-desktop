import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step5Shifts from "./Step5Shifts";
import * as OnboardingContext from "../OnboardingContext";

vi.mock("../OnboardingContext", () => ({
  useOnboardingData: vi.fn(),
}));

describe("Step5Shifts", () => {
  const mockSetStepData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when shifts disabled", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          enabled: false,
          dayShiftStart: undefined,
          dayShiftEnd: undefined,
          nightShiftStart: undefined,
          nightShiftEnd: undefined,
        },
        setStepData: mockSetStepData,
      } as any);
    });

    it("should render switch for shifts option", () => {
      render(<Step5Shifts />);
      const switchElement = screen.getByRole("switch", { name: /Alternar opción/i });
      expect(switchElement).toBeInTheDocument();
    });

    it("should display question '¿Trabajan por turnos?'", () => {
      render(<Step5Shifts />);
      expect(screen.getByText("¿Trabajan por turnos?")).toBeInTheDocument();
    });

    it("should not render shift time inputs when disabled", () => {
      render(<Step5Shifts />);
      expect(screen.queryByLabelText("Inicio turno diurno")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Fin turno diurno")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Inicio turno nocturno")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Fin turno nocturno")).not.toBeInTheDocument();
    });

    it("should not render shift header when disabled", () => {
      render(<Step5Shifts />);
      expect(screen.queryByText("Horarios de turno:")).not.toBeInTheDocument();
    });

    it("should have switch unchecked when disabled", () => {
      render(<Step5Shifts />);
      const switchElement = screen.getByRole("switch", { name: /Alternar opción/i }) as HTMLInputElement;
      expect(switchElement.checked).toBe(false);
    });
  });

  describe("when shifts enabled", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          enabled: true,
          dayShiftStart: "06:00",
          dayShiftEnd: "18:00",
          nightShiftStart: "18:00",
          nightShiftEnd: "06:00",
        },
        setStepData: mockSetStepData,
      } as any);
    });

    it("should render all shift time inputs", () => {
      render(<Step5Shifts />);
      expect(screen.getByLabelText("Inicio turno diurno")).toBeInTheDocument();
      expect(screen.getByLabelText("Fin turno diurno")).toBeInTheDocument();
      expect(screen.getByLabelText("Inicio turno nocturno")).toBeInTheDocument();
      expect(screen.getByLabelText("Fin turno nocturno")).toBeInTheDocument();
    });

    it("should display shift header", () => {
      render(<Step5Shifts />);
      expect(screen.getByText("Horarios de turno:")).toBeInTheDocument();
    });

    it("should display day shift start value", () => {
      render(<Step5Shifts />);
      const dayStartInput = screen.getByLabelText("Inicio turno diurno") as HTMLInputElement;
      expect(dayStartInput.value).toBe("06:00");
    });

    it("should display day shift end value", () => {
      render(<Step5Shifts />);
      const dayEndInput = screen.getByLabelText("Fin turno diurno") as HTMLInputElement;
      expect(dayEndInput.value).toBe("18:00");
    });

    it("should display night shift start value", () => {
      render(<Step5Shifts />);
      const nightStartInput = screen.getByLabelText("Inicio turno nocturno") as HTMLInputElement;
      expect(nightStartInput.value).toBe("18:00");
    });

    it("should display night shift end value", () => {
      render(<Step5Shifts />);
      const nightEndInput = screen.getByLabelText("Fin turno nocturno") as HTMLInputElement;
      expect(nightEndInput.value).toBe("06:00");
    });

    it("should have switch checked when enabled", () => {
      render(<Step5Shifts />);
      const switchElement = screen.getByRole("switch", { name: /Alternar opción/i }) as HTMLInputElement;
      expect(switchElement.checked).toBe(true);
    });

    it("should render all input labels", () => {
      render(<Step5Shifts />);
      expect(screen.getByText("Turno diurno inicio")).toBeInTheDocument();
      expect(screen.getByText("Turno diurno fin")).toBeInTheDocument();
      expect(screen.getByText("Turno nocturno inicio")).toBeInTheDocument();
      expect(screen.getByText("Turno nocturno fin")).toBeInTheDocument();
    });
  });

  describe("switching shifts on/off", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          enabled: false,
          dayShiftStart: undefined,
          dayShiftEnd: undefined,
          nightShiftStart: undefined,
          nightShiftEnd: undefined,
        },
        setStepData: mockSetStepData,
      } as any);
    });

    it("should call setStepData when switch is toggled", async () => {
      const user = userEvent.setup();
      render(<Step5Shifts />);

      const switchElement = screen.getByRole("switch", { name: /Alternar opción/i });
      await user.click(switchElement);

      expect(mockSetStepData).toHaveBeenCalled();
      const lastCall = mockSetStepData.mock.calls[mockSetStepData.mock.calls.length - 1][0];
      expect(lastCall.enabled).toBe(true);
    });

    it("should toggle switch state properly", async () => {
      const user = userEvent.setup();
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          enabled: true,
          dayShiftStart: "06:00",
          dayShiftEnd: "18:00",
          nightShiftStart: "18:00",
          nightShiftEnd: "06:00",
        },
        setStepData: mockSetStepData,
      } as any);

      render(<Step5Shifts />);

      const switchElement = screen.getByRole("switch", { name: /Alternar opción/i });
      await user.click(switchElement);

      expect(mockSetStepData).toHaveBeenCalled();
      const lastCall = mockSetStepData.mock.calls[mockSetStepData.mock.calls.length - 1][0];
      expect(lastCall.enabled).toBe(false);
    });
  });

  describe("time input changes", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          enabled: true,
          dayShiftStart: "06:00",
          dayShiftEnd: "18:00",
          nightShiftStart: "18:00",
          nightShiftEnd: "06:00",
        },
        setStepData: mockSetStepData,
      } as any);
    });

    it("should call setStepData when day shift start changes", async () => {
      const user = userEvent.setup();
      render(<Step5Shifts />);

      const dayStartInput = screen.getByLabelText("Inicio turno diurno");
      await user.clear(dayStartInput);
      await user.type(dayStartInput, "07:00");

      expect(mockSetStepData).toHaveBeenCalled();
      const lastCall = mockSetStepData.mock.calls[mockSetStepData.mock.calls.length - 1][0];
      expect(lastCall.dayShiftStart).toBeDefined();
    });

    it("should call setStepData when day shift end changes", async () => {
      const user = userEvent.setup();
      render(<Step5Shifts />);

      const dayEndInput = screen.getByLabelText("Fin turno diurno");
      await user.clear(dayEndInput);
      await user.type(dayEndInput, "19:00");

      expect(mockSetStepData).toHaveBeenCalled();
      const lastCall = mockSetStepData.mock.calls[mockSetStepData.mock.calls.length - 1][0];
      expect(lastCall.dayShiftEnd).toBeDefined();
    });

    it("should call setStepData when night shift start changes", async () => {
      const user = userEvent.setup();
      render(<Step5Shifts />);

      const nightStartInput = screen.getByLabelText("Inicio turno nocturno");
      await user.clear(nightStartInput);
      await user.type(nightStartInput, "19:00");

      expect(mockSetStepData).toHaveBeenCalled();
      const lastCall = mockSetStepData.mock.calls[mockSetStepData.mock.calls.length - 1][0];
      expect(lastCall.nightShiftStart).toBeDefined();
    });

    it("should call setStepData when night shift end changes", async () => {
      const user = userEvent.setup();
      render(<Step5Shifts />);

      const nightEndInput = screen.getByLabelText("Fin turno nocturno");
      await user.clear(nightEndInput);
      await user.type(nightEndInput, "07:00");

      expect(mockSetStepData).toHaveBeenCalled();
      const lastCall = mockSetStepData.mock.calls[mockSetStepData.mock.calls.length - 1][0];
      expect(lastCall.nightShiftEnd).toBeDefined();
    });
  });

  describe("default time values when undefined", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          enabled: true,
          dayShiftStart: undefined,
          dayShiftEnd: undefined,
          nightShiftStart: undefined,
          nightShiftEnd: undefined,
        },
        setStepData: mockSetStepData,
      } as any);
    });

    it("should display default 06:00 for day shift start", () => {
      render(<Step5Shifts />);
      const dayStartInput = screen.getByLabelText("Inicio turno diurno") as HTMLInputElement;
      expect(dayStartInput.value).toBe("06:00");
    });

    it("should display default 18:00 for day shift end", () => {
      render(<Step5Shifts />);
      const dayEndInput = screen.getByLabelText("Fin turno diurno") as HTMLInputElement;
      expect(dayEndInput.value).toBe("18:00");
    });

    it("should display default 18:00 for night shift start", () => {
      render(<Step5Shifts />);
      const nightStartInput = screen.getByLabelText("Inicio turno nocturno") as HTMLInputElement;
      expect(nightStartInput.value).toBe("18:00");
    });

    it("should display default 06:00 for night shift end", () => {
      render(<Step5Shifts />);
      const nightEndInput = screen.getByLabelText("Fin turno nocturno") as HTMLInputElement;
      expect(nightEndInput.value).toBe("06:00");
    });
  });

  describe("input types and attributes", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          enabled: true,
          dayShiftStart: "06:00",
          dayShiftEnd: "18:00",
          nightShiftStart: "18:00",
          nightShiftEnd: "06:00",
        },
        setStepData: mockSetStepData,
      } as any);
    });

    it("should have time inputs available", () => {
      render(<Step5Shifts />);
      const dayStartInput = screen.getByLabelText("Inicio turno diurno") as HTMLInputElement;
      expect(dayStartInput).toBeInTheDocument();
      expect(dayStartInput.type).toBe("time");
    });

    it("should have aria-labels on all inputs", () => {
      render(<Step5Shifts />);
      expect(screen.getByLabelText("Inicio turno diurno")).toHaveAttribute("aria-label");
      expect(screen.getByLabelText("Fin turno diurno")).toHaveAttribute("aria-label");
      expect(screen.getByLabelText("Inicio turno nocturno")).toHaveAttribute("aria-label");
      expect(screen.getByLabelText("Fin turno nocturno")).toHaveAttribute("aria-label");
    });
  });

  describe("layout and styling", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          enabled: true,
          dayShiftStart: "06:00",
          dayShiftEnd: "18:00",
          nightShiftStart: "18:00",
          nightShiftEnd: "06:00",
        },
        setStepData: mockSetStepData,
      } as any);
    });

    it("should render inputs in 2-column grid on small screens and up", () => {
      const { container } = render(<Step5Shifts />);
      const grid = container.querySelector(".grid.gap-2.sm\\:grid-cols-2");
      expect(grid).toBeInTheDocument();
    });

    it("should render container with space-y-4", () => {
      const { container } = render(<Step5Shifts />);
      const mainContainer = container.querySelector(".space-y-4");
      expect(mainContainer).toBeInTheDocument();
    });

    it("should render shift input rows with proper styling", () => {
      const { container } = render(<Step5Shifts />);
      const rows = container.querySelectorAll(".flex.items-center.justify-between");
      expect(rows.length).toBe(4);
    });
  });

  describe("multiple rapid time changes", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          enabled: true,
          dayShiftStart: "06:00",
          dayShiftEnd: "18:00",
          nightShiftStart: "18:00",
          nightShiftEnd: "06:00",
        },
        setStepData: mockSetStepData,
      } as any);
    });

    it("should handle changing day shift start input", async () => {
      const user = userEvent.setup();
      render(<Step5Shifts />);

      const dayStartInput = screen.getByLabelText("Inicio turno diurno");

      await user.clear(dayStartInput);
      await user.type(dayStartInput, "05:00");

      expect(mockSetStepData).toHaveBeenCalled();
    });
  });

  describe("conditional rendering based on enabled state", () => {
    it("should not show inputs when enabled is false", () => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          enabled: false,
          dayShiftStart: undefined,
          dayShiftEnd: undefined,
          nightShiftStart: undefined,
          nightShiftEnd: undefined,
        },
        setStepData: mockSetStepData,
      } as any);

      render(<Step5Shifts />);
      expect(screen.queryByLabelText("Inicio turno diurno")).not.toBeInTheDocument();
    });

    it("should show inputs when enabled is true", () => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          enabled: true,
          dayShiftStart: "06:00",
          dayShiftEnd: "18:00",
          nightShiftStart: "18:00",
          nightShiftEnd: "06:00",
        },
        setStepData: mockSetStepData,
      } as any);

      render(<Step5Shifts />);
      expect(screen.getByLabelText("Inicio turno diurno")).toBeInTheDocument();
    });

    it("should toggle switch when clicked", async () => {
      const user = userEvent.setup();
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          enabled: false,
          dayShiftStart: undefined,
          dayShiftEnd: undefined,
          nightShiftStart: undefined,
          nightShiftEnd: undefined,
        },
        setStepData: mockSetStepData,
      } as any);

      render(<Step5Shifts />);

      const switchElement = screen.getByRole("switch", { name: /Alternar opción/i });
      await user.click(switchElement);

      expect(mockSetStepData).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true })
      );
    });
  });

  describe("component memoization", () => {
    it("should render without errors on remount", () => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          enabled: true,
          dayShiftStart: "06:00",
          dayShiftEnd: "18:00",
          nightShiftStart: "18:00",
          nightShiftEnd: "06:00",
        },
        setStepData: mockSetStepData,
      } as any);

      const { rerender } = render(<Step5Shifts />);
      expect(screen.getByText("¿Trabajan por turnos?")).toBeInTheDocument();

      rerender(<Step5Shifts />);
      expect(screen.getByText("¿Trabajan por turnos?")).toBeInTheDocument();
    });
  });
});
