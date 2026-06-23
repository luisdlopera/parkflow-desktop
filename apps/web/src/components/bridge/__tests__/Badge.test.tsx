import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../Badge";

describe("Badge", () => {
  it("renders text", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("respects color prop", () => {
    const { container } = render(<Badge color="success">Active</Badge>);
    expect(container.querySelector(".badge--success")).toBeInTheDocument();
  });

  it("supports legacy tone and label props", () => {
    render(<Badge tone="warning" label="Warning" />);
    expect(screen.getByText("Warning")).toBeInTheDocument();
  });
});
