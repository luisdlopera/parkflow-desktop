import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "../Input";

describe("Input", () => {
  it("renders input and label", () => {
    render(<Input label="Email" value="" onChange={() => {}} />);
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("calls onChange when the value changes", async () => {
    const onChange = vi.fn();
    render(<Input aria-label="Name" value="" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "abc");
    expect(onChange).toHaveBeenCalledTimes(3);
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(lastCall[0].target.value).toBe("c");
  });

  it("displays an error state with message", () => {
    render(
      <Input
        label="Name"
        value=""
        isInvalid
        errorMessage="Required field"
        onChange={() => {}}
      />
    );
    expect(screen.getByText("Required field")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });
});
