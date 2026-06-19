import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stat } from "./Stat";

describe("Stat", () => {
  it("renders label and value", () => {
    render(<Stat label="Total Vehicles" value={42} />);
    expect(screen.getByText("Total Vehicles")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders undefined value as dash", () => {
    render(<Stat label="Count" value={undefined} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders string values", () => {
    render(<Stat label="Status" value="Active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <Stat label="Test" value="Value" className="custom-stat" />
    );
    expect(container.querySelector(".custom-stat")).toBeInTheDocument();
  });

  it("has correct styling classes", () => {
    const { container } = render(<Stat label="Test" value="Value" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("border-slate-200");
    expect(div.className).toContain("bg-white");
  });
});
