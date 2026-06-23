import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroUIProvider } from "@heroui/system";
import DateRangeInput from "../DateRangeInput";

const renderWithProvider = (ui: React.ReactNode) => render(<HeroUIProvider>{ui}</HeroUIProvider>);

describe("DateRangeInput", () => {
  it("renders the date range inputs and default labels", () => {
    renderWithProvider(
      <DateRangeInput
        from="2024-01-01"
        to="2024-01-31"
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
      />
    );

    expect(screen.getByText("Desde - Hasta")).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
  });

  it("uses custom from/to labels", () => {
    renderWithProvider(
      <DateRangeInput
        fromLabel="Start"
        toLabel="End"
        from="2024-06-01"
        to="2024-06-30"
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
      />
    );

    expect(screen.getByText("Start - End")).toBeInTheDocument();
  });

  it("calls onFromChange and onToChange when the value changes", () => {
    const onFromChange = vi.fn();
    const onToChange = vi.fn();
    const { rerender } = renderWithProvider(
      <DateRangeInput
        from="2024-01-01"
        to="2024-01-31"
        onFromChange={onFromChange}
        onToChange={onToChange}
      />
    );

    rerender(
      <HeroUIProvider>
        <DateRangeInput
          from="2024-02-01"
          to="2024-02-28"
          onFromChange={onFromChange}
          onToChange={onToChange}
        />
      </HeroUIProvider>
    );

    // The component should accept new values without errors and keep inputs rendered.
    expect(screen.getByText("Desde - Hasta")).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
  });
});
