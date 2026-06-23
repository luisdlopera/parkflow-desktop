import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CircularCheckbox } from "../CircularCheckbox";

describe("CircularCheckbox", () => {
  it("renders a checkbox", () => {
    render(<CircularCheckbox />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("reflects the checked state", () => {
    render(<CircularCheckbox checked={true} onChange={() => {}} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("supports an aria-label", () => {
    render(<CircularCheckbox aria-label="Select row" />);
    expect(screen.getByLabelText("Select row")).toBeInTheDocument();
  });
});
