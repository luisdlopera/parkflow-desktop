import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../Button";

describe("Button", () => {
  it("renders a button with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respects variant and size", () => {
    const { container } = render(
      <Button variant="danger" size="lg">
        Danger
      </Button>
    );
    const button = container.querySelector("button");
    expect(button).toBeInTheDocument();
    expect(button?.className).toContain("bg-red-600");
    expect(button?.className).toContain("min-h-12");
  });

  it("is disabled and ignores clicks", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
