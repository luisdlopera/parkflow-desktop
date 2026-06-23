import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StatusToggle } from "../StatusToggle";
import { DialogProvider } from "@/components/ui/DialogProvider";

const MockWrapper = ({ children }: { children: React.ReactNode }) => (
  <DialogProvider>{children}</DialogProvider>
);

describe("StatusToggle Component", () => {
  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnChange = vi.fn();
  });

  // Test 1: Render with active=true
  it("should render with active state true", () => {
    const { container } = render(
      <StatusToggle active={true} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button).toBeInTheDocument();
  });

  // Test 2: Render with active=false
  it("should render with active state false", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button).toBeInTheDocument();
  });

  // Test 3: Disabled state
  it("should be disabled when disabled prop is true", () => {
    const { container } = render(
      <StatusToggle active={true} onChange={mockOnChange} disabled={true} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button).toBeDisabled();
  });

  // Test 4: Has aria-pressed attribute
  it("should have aria-pressed attribute", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button).toHaveAttribute("aria-pressed");
  });

  // Test 5: Button type is button
  it("should be type button", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button?.getAttribute("type")).toBe("button");
  });

  // Test 6: Has rounded-full class
  it("should have rounded-full styling", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button?.className).toContain("rounded-full");
  });

  // Test 7: Inactive has bg-slate
  it("should have slate background when inactive", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button?.className).toContain("bg-slate");
  });

  // Test 8: Active has bg-emerald
  it("should have emerald background when active", () => {
    const { container } = render(
      <StatusToggle active={true} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button?.className).toContain("bg-emerald");
  });

  // Test 9: Click when enabled calls onChange
  it("should call onChange when clicked", async () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    fireEvent.click(button!);
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  // Test 10: Click when disabled does not call onChange
  it("should not call onChange when disabled", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} disabled={true} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    fireEvent.click(button!);
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  // Test 11: Has inner span element
  it("should have inner span for toggle indicator", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const span = container.querySelector("button span");
    expect(span).toBeInTheDocument();
  });

  // Test 12: Inner span has transform classes
  it("should have transform classes on span", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const span = container.querySelector("button span");
    expect(span?.className).toContain("transform");
  });

  // Test 13: Active true passes true to onChange
  it("should call onChange with true when inactive is toggled", async () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    fireEvent.click(button!);
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(true);
    });
  });

  // Test 14: Active false passes false to onChange
  it("should call onChange with false when active is toggled", async () => {
    const { container } = render(
      <StatusToggle active={true} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    fireEvent.click(button!);
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(false);
    });
  });

  // Test 15: Disabled prop adds opacity-50
  it("should have opacity-50 when disabled", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} disabled={true} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button?.className).toContain("opacity-50");
  });

  // Test 16: Disabled prop adds cursor-not-allowed
  it("should have cursor-not-allowed when disabled", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} disabled={true} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button?.className).toContain("cursor-not-allowed");
  });

  // Test 17: Enabled has cursor-pointer
  it("should have cursor-pointer when enabled", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} disabled={false} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button?.className).toContain("cursor-pointer");
  });

  // Test 18: Span has rounded-full
  it("should have rounded-full on inner span", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const span = container.querySelector("button span");
    expect(span?.className).toContain("rounded-full");
  });

  // Test 19: Span has bg-white
  it("should have white background on inner span", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const span = container.querySelector("button span");
    expect(span?.className).toContain("bg-white");
  });

  // Test 20: Default disabled is false
  it("should not be disabled by default", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button).not.toBeDisabled();
  });

  // Test 21: Renders successfully with all props
  it("should render with all props provided", () => {
    const { container } = render(
      <StatusToggle
        active={true}
        onChange={mockOnChange}
        disabled={false}
        confirmMessage="Are you sure?"
      />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button).toBeInTheDocument();
  });

  // Test 22: Has aria-label
  it("should have aria-label attribute", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button).toHaveAttribute("aria-label");
  });

  // Test 23: Has transition classes
  it("should have transition-colors class", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button?.className).toContain("transition-colors");
  });

  // Test 24: Button has inline-flex
  it("should have inline-flex layout", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button?.className).toContain("inline-flex");
  });

  // Test 25: Button has fixed width
  it("should have width class", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button?.className).toContain("w-");
  });

  // Test 26: Button has fixed height
  it("should have height class", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const button = container.querySelector("button[type='button']");
    expect(button?.className).toContain("h-");
  });

  // Test 27: Span has width class
  it("should have width on inner span", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const span = container.querySelector("button span");
    expect(span?.className).toContain("w-");
  });

  // Test 28: Span has height class
  it("should have height on inner span", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const span = container.querySelector("button span");
    expect(span?.className).toContain("h-");
  });

  // Test 29: Has transition-transform on span
  it("should have transition-transform on span", () => {
    const { container } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const span = container.querySelector("button span");
    expect(span?.className).toContain("transition-transform");
  });

  // Test 30: Different active values render correctly
  it("should render both active and inactive states", () => {
    const { container: containerActive } = render(
      <StatusToggle active={true} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );
    const { container: containerInactive } = render(
      <StatusToggle active={false} onChange={mockOnChange} />,
      { wrapper: MockWrapper }
    );

    const buttonActive = containerActive.querySelector("button[type='button']");
    const buttonInactive = containerInactive.querySelector("button[type='button']");

    expect(buttonActive).toBeInTheDocument();
    expect(buttonInactive).toBeInTheDocument();
    expect(buttonActive?.className).not.toBe(buttonInactive?.className);
  });
});
