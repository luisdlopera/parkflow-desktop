import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "../Switch";

describe("Switch", () => {
  it("renders with a label", () => {
    render(<Switch>Enable feature</Switch>);
    expect(screen.getByText("Enable feature")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("reflects the selected state", () => {
    render(<Switch isSelected={true}>On</Switch>);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("calls onChange when toggled", async () => {
    const onChange = vi.fn();
    render(<Switch onChange={onChange}>Toggle</Switch>);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
