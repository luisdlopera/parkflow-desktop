import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step10Sites from "./Step10Sites";
import * as OnboardingContext from "../OnboardingContext";

// Mock the OnboardingContext
vi.mock("../OnboardingContext", () => ({
  useOnboardingData: vi.fn(),
  useOnboardingMetadata: vi.fn(),
}));

describe("Step10Sites", () => {
  const mockSetStepData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when canMultiSite is false", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          multiSite: false,
          siteName1: undefined,
          siteName2: undefined,
        },
        setStepData: mockSetStepData,
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        canMultiSite: false,
      } as any);
    });

    it("should render switch with disabled state", () => {
      render(<Step10Sites />);
      const switchElement = screen.getByRole("switch", { name: /Alternar opción/i });
      expect(switchElement).toBeDisabled();
    });

    it("should render warning message about superior plan", () => {
      render(<Step10Sites />);
      expect(screen.getByText(/Disponible en plan superior/i)).toBeInTheDocument();
    });

    it("should not render site name inputs", () => {
      render(<Step10Sites />);
      expect(screen.queryByLabelText("Nombre sede principal")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Nombre sede secundaria")).not.toBeInTheDocument();
    });

    it("should have label '¿Varias sedes?'", () => {
      render(<Step10Sites />);
      expect(screen.getByText("¿Varias sedes?")).toBeInTheDocument();
    });
  });

  describe("when canMultiSite is true and multiSite is false", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          multiSite: false,
          siteName1: undefined,
          siteName2: undefined,
        },
        setStepData: mockSetStepData,
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        canMultiSite: true,
      } as any);
    });

    it("should render switch with enabled state", () => {
      render(<Step10Sites />);
      const switchElement = screen.getByRole("switch", { name: /Alternar opción/i });
      expect(switchElement).not.toBeDisabled();
    });

    it("should not render warning message", () => {
      render(<Step10Sites />);
      expect(screen.queryByText(/Disponible en plan superior/i)).not.toBeInTheDocument();
    });

    it("should not render site name inputs when multiSite is false", () => {
      render(<Step10Sites />);
      expect(screen.queryByLabelText("Nombre sede principal")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Nombre sede secundaria")).not.toBeInTheDocument();
    });

    it("should call setStepData with multiSite true when switch is toggled", async () => {
      const user = userEvent.setup();
      render(<Step10Sites />);

      const switchElement = screen.getByRole("switch", { name: /Alternar opción/i });
      await user.click(switchElement);

      expect(mockSetStepData).toHaveBeenCalledWith({
        multiSite: true,
        siteName1: undefined,
        siteName2: undefined,
      });
    });
  });

  describe("when canMultiSite is true and multiSite is true", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          multiSite: true,
          siteName1: "Sede A",
          siteName2: "Sede B",
        },
        setStepData: mockSetStepData,
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        canMultiSite: true,
      } as any);
    });

    it("should render both site name inputs", () => {
      render(<Step10Sites />);
      expect(screen.getByLabelText("Nombre sede principal")).toBeInTheDocument();
      expect(screen.getByLabelText("Nombre sede secundaria")).toBeInTheDocument();
    });

    it("should display siteName1 value in primary site input", () => {
      render(<Step10Sites />);
      const input1 = screen.getByLabelText("Nombre sede principal") as HTMLInputElement;
      expect(input1.value).toBe("Sede A");
    });

    it("should display siteName2 value in secondary site input", () => {
      render(<Step10Sites />);
      const input2 = screen.getByLabelText("Nombre sede secundaria") as HTMLInputElement;
      expect(input2.value).toBe("Sede B");
    });

    it("should render labels for site inputs", () => {
      render(<Step10Sites />);
      expect(screen.getByText("Nombre sede principal")).toBeInTheDocument();
      expect(screen.getByText("Nombre sede secundaria")).toBeInTheDocument();
    });
  });

  describe("site name input changes", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          multiSite: true,
          siteName1: "Original Site 1",
          siteName2: "Original Site 2",
        },
        setStepData: mockSetStepData,
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        canMultiSite: true,
      } as any);
    });

    it("should call setStepData when siteName1 changes", async () => {
      const user = userEvent.setup();
      render(<Step10Sites />);

      const input1 = screen.getByLabelText("Nombre sede principal");
      await user.clear(input1);
      await user.type(input1, "New Site 1");

      expect(mockSetStepData).toHaveBeenCalled();
    });

    it("should call setStepData when siteName2 changes", async () => {
      const user = userEvent.setup();
      render(<Step10Sites />);

      const input2 = screen.getByLabelText("Nombre sede secundaria");
      await user.clear(input2);
      await user.type(input2, "New Site 2");

      expect(mockSetStepData).toHaveBeenCalled();
    });

    it("should preserve multiSite state when updating siteName1", async () => {
      const user = userEvent.setup();
      render(<Step10Sites />);
      const input1 = screen.getByLabelText("Nombre sede principal");
      await user.clear(input1);
      await user.type(input1, "Updated");

      expect(mockSetStepData).toHaveBeenCalled();
      const lastCall = mockSetStepData.mock.calls[mockSetStepData.mock.calls.length - 1][0];
      expect(lastCall.multiSite).toBe(true);
    });
  });

  describe("default values when undefined", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          multiSite: true,
          siteName1: undefined,
          siteName2: undefined,
        },
        setStepData: mockSetStepData,
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        canMultiSite: true,
      } as any);
    });

    it("should display default 'Sede principal' when siteName1 is undefined", () => {
      render(<Step10Sites />);
      const input1 = screen.getByLabelText("Nombre sede principal") as HTMLInputElement;
      expect(input1.value).toBe("Sede principal");
    });

    it("should display default 'Sede secundaria' when siteName2 is undefined", () => {
      render(<Step10Sites />);
      const input2 = screen.getByLabelText("Nombre sede secundaria") as HTMLInputElement;
      expect(input2.value).toBe("Sede secundaria");
    });
  });

  describe("switch toggle when multiSite is true", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          multiSite: true,
          siteName1: "Sede A",
          siteName2: "Sede B",
        },
        setStepData: mockSetStepData,
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        canMultiSite: true,
      } as any);
    });

    it("should call setStepData with multiSite false when switch is toggled off", async () => {
      const user = userEvent.setup();
      render(<Step10Sites />);

      const switchElement = screen.getByRole("switch", { name: /Alternar opción/i });
      await user.click(switchElement);

      expect(mockSetStepData).toHaveBeenCalledWith({
        multiSite: false,
        siteName1: "Sede A",
        siteName2: "Sede B",
      });
    });

    it("should have switch checked when multiSite is true", () => {
      render(<Step10Sites />);
      const switchElement = screen.getByRole("switch", { name: /Alternar opción/i }) as HTMLInputElement;
      expect(switchElement.checked).toBe(true);
    });
  });

  describe("switch toggle when multiSite is false", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          multiSite: false,
          siteName1: undefined,
          siteName2: undefined,
        },
        setStepData: mockSetStepData,
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        canMultiSite: true,
      } as any);
    });

    it("should not have switch checked when multiSite is false", () => {
      render(<Step10Sites />);
      const switchElement = screen.getByRole("switch", { name: /Alternar opción/i }) as HTMLInputElement;
      expect(switchElement.checked).toBe(false);
    });
  });

  describe("input styling and layout", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          multiSite: true,
          siteName1: "Sede A",
          siteName2: "Sede B",
        },
        setStepData: mockSetStepData,
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        canMultiSite: true,
      } as any);
    });

    it("should render site inputs in container with proper styling", () => {
      const { container } = render(<Step10Sites />);
      const inputsContainer = container.querySelector(".mt-3.space-y-2");
      expect(inputsContainer).toBeInTheDocument();
    });

    it("should render input rows with flex layout", () => {
      const { container } = render(<Step10Sites />);
      const rows = container.querySelectorAll(".flex.items-center.justify-between");
      expect(rows.length).toBe(2);
    });
  });

  describe("accessibility", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          multiSite: true,
          siteName1: "Sede A",
          siteName2: "Sede B",
        },
        setStepData: mockSetStepData,
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        canMultiSite: true,
      } as any);
    });

    it("should have aria-label on switch", () => {
      render(<Step10Sites />);
      const switchElement = screen.getByRole("switch", { name: /Alternar opción/i });
      expect(switchElement).toHaveAttribute("aria-label", "Alternar opción");
    });

    it("should have aria-labels on input fields", () => {
      render(<Step10Sites />);
      expect(screen.getByLabelText("Nombre sede principal")).toHaveAttribute("aria-label");
      expect(screen.getByLabelText("Nombre sede secundaria")).toHaveAttribute("aria-label");
    });
  });

  describe("multiple rapid interactions", () => {
    beforeEach(() => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          multiSite: true,
          siteName1: "Site 1",
          siteName2: "Site 2",
        },
        setStepData: mockSetStepData,
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        canMultiSite: true,
      } as any);
    });

    it("should handle rapid input changes", async () => {
      const user = userEvent.setup();
      render(<Step10Sites />);

      const input1 = screen.getByLabelText("Nombre sede principal");
      await user.clear(input1);
      await user.type(input1, "A");

      expect(mockSetStepData).toHaveBeenCalled();
    });

    it("should handle switch toggle", async () => {
      const user = userEvent.setup();
      render(<Step10Sites />);

      const switchElement = screen.getByRole("switch", { name: /Alternar opción/i });

      await user.click(switchElement);
      expect(mockSetStepData).toHaveBeenCalled();
    });
  });

  describe("component memoization", () => {
    it("should render without crashing when re-mounted", () => {
      vi.mocked(OnboardingContext.useOnboardingData).mockReturnValue({
        stepData: {
          multiSite: false,
          siteName1: undefined,
          siteName2: undefined,
        },
        setStepData: mockSetStepData,
      } as any);

      vi.mocked(OnboardingContext.useOnboardingMetadata).mockReturnValue({
        canMultiSite: true,
      } as any);

      const { rerender } = render(<Step10Sites />);
      expect(screen.getByText("¿Varias sedes?")).toBeInTheDocument();

      rerender(<Step10Sites />);
      expect(screen.getByText("¿Varias sedes?")).toBeInTheDocument();
    });
  });
});
