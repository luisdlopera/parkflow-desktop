import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InlineError } from "./InlineError";

describe("InlineError", () => {
  it("renders null when message is null", () => {
    const { container } = render(<InlineError message={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders error message when provided", () => {
    const message = "Test error message";
    render(<InlineError message={message} />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <InlineError message="Error" className="custom-class" />
    );
    const div = container.querySelector(".custom-class");
    expect(div).toBeInTheDocument();
  });

  it("has correct styling classes", () => {
    const { container } = render(<InlineError message="Error" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("bg-rose-50");
    expect(div.className).toContain("text-rose-700");
  });
});
