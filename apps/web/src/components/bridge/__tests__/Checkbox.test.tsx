import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "../Checkbox";

describe("Checkbox", () => {
  it("renders with a label", () => {
    render(<Checkbox>Accept terms</Checkbox>);
    expect(screen.getByText("Accept terms")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("reflects the checked state", () => {
    render(<Checkbox isSelected={true}>On</Checkbox>);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("calls onChange when toggled", async () => {
    const onChange = vi.fn();
    render(<Checkbox onChange={onChange}>Toggle</Checkbox>);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
