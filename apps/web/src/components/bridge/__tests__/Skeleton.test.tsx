import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "../Skeleton";

describe("Skeleton", () => {
  it("renders skeleton elements", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector(".skeleton")).toBeInTheDocument();
  });

  it("respects animationType", () => {
    const { container } = render(<Skeleton animationType="pulse" />);
    expect(container.querySelector(".skeleton--pulse")).toBeInTheDocument();
  });
});
