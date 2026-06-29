import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageSkeleton } from "../PageSkeleton";

describe("PageSkeleton", () => {
  it("renders skeleton elements", () => {
    const { container } = render(<PageSkeleton />);
    const shimmerElements = container.querySelectorAll(".animate-shimmer");
    expect(shimmerElements.length).toBeGreaterThan(0);
  });

  it("renders with correct container layout", () => {
    const { container } = render(<PageSkeleton />);
    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv.className).toContain("flex");
    expect(mainDiv.className).toContain("flex-col");
    expect(mainDiv.className).toContain("gap-6");
    expect(mainDiv.className).toContain("p-6");
  });

  it("renders title skeleton", () => {
    render(<PageSkeleton />);
    const shimmerDivs = document.querySelectorAll(".animate-shimmer");
    expect(shimmerDivs.length).toBeGreaterThanOrEqual(1);
  });

  it("renders stats card skeletons", () => {
    const { container } = render(<PageSkeleton />);
    const gridDiv = container.querySelector(".grid");
    expect(gridDiv).toBeInTheDocument();
    expect(gridDiv?.className).toContain("grid-cols-1");
    expect(gridDiv?.className).toContain("md:grid-cols-3");
  });

  it("renders table skeleton with border", () => {
    const { container } = render(<PageSkeleton />);
    const tableSkeleton = container.querySelector(".overflow-hidden");
    expect(tableSkeleton).toBeInTheDocument();
    expect(tableSkeleton?.className).toContain("rounded-xl");
    expect(tableSkeleton?.className).toContain("border");
    expect(tableSkeleton?.className).toContain("border-default-200");
  });

  it("renders the correct number of skeleton rows", () => {
    const { container } = render(<PageSkeleton />);
    const cardSkeletons = container.querySelectorAll("[class*='animate-shimmer']");
    expect(cardSkeletons.length).toBeGreaterThanOrEqual(1);
    const tableRowSkeletons = container.querySelectorAll(".gap-4");
    expect(tableRowSkeletons.length).toBeGreaterThanOrEqual(1);
  });
});
