import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Spinner } from "../Spinner";

describe("Spinner", () => {
  it("renders a spinner", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector(".spinner")).toBeInTheDocument();
  });

  it("respects size", () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.querySelector(".spinner--lg")).toBeInTheDocument();
  });
});
