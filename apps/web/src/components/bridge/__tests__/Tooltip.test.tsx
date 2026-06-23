import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroUIProvider } from "@heroui/system";
import { Tooltip } from "../Tooltip";

const renderWithProvider = (ui: React.ReactNode) => render(<HeroUIProvider>{ui}</HeroUIProvider>);

describe("Tooltip", () => {
  it("renders the trigger element", () => {
    renderWithProvider(
      <Tooltip content="Help text">
        <span>Hover me</span>
      </Tooltip>
    );

    expect(screen.getByText("Hover me")).toBeInTheDocument();
  });

  it("sets the tooltip content as the trigger aria-label", () => {
    renderWithProvider(
      <Tooltip content="Help text">
        <span>Hover me</span>
      </Tooltip>
    );

    const trigger = screen.getByText("Hover me").parentElement;
    expect(trigger).toHaveAttribute("aria-label", "Help text");
    expect(trigger).toHaveAttribute("role", "button");
  });
});
