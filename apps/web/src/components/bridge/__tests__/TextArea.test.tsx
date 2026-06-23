import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextArea } from "../TextArea";

describe("TextArea", () => {
  it("renders textarea and label", () => {
    render(<TextArea label="Notes" value="" onChange={() => {}} />);
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("calls onChange when typing", async () => {
    const onChange = vi.fn();
    render(<TextArea aria-label="Notes" value="" onChange={onChange} />);
    const textarea = screen.getByRole("textbox");
    await userEvent.type(textarea, "hello");
    expect(onChange).toHaveBeenCalledTimes(5);
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(lastCall[0].target.value).toBe("o");
  });

  it("shows an error message when invalid", () => {
    render(
      <TextArea
        label="Description"
        value=""
        isInvalid
        errorMessage="Too short"
        onChange={() => {}}
      />
    );
    expect(screen.getByText("Too short")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });
});
