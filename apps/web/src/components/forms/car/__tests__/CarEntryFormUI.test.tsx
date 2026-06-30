import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CarEntryFormUI } from "../CarEntryFormUI";
import { useForm } from "react-hook-form";
import React from "react";

function TestWrapper(props: any) {
  const form = useForm({
    defaultValues: {
      plate: "",
      entryMode: "VISITOR",
    },
  });

  return (
    <CarEntryFormUI
      form={form as any}
      onSubmit={props.onSubmit || vi.fn()}
      onKeyDown={vi.fn()}
      plateInputRef={{ current: null }}
      occupancy={null}
      stats={{ today: 0, session: 0 }}
      isSubmitDisabled={props.isSubmitDisabled || false}
      submitDisabledReason={props.submitDisabledReason}
      noPlate={props.noPlate || false}
      platePrefix={props.platePrefix}
    />
  );
}

describe("CarEntryFormUI", () => {
  it("renders plate input", () => {
    render(<TestWrapper />);
    expect(screen.getByTestId("plate")).toBeDefined();
  });

  it("shows disabled submit banner when submit is disabled", () => {
    render(<TestWrapper isSubmitDisabled={true} submitDisabledReason="Falta placa" />);
    const submitBtn = screen.getByTestId("register-entry");
    expect(submitBtn.className).toContain("cursor-not-allowed");
    expect(submitBtn.getAttribute("aria-describedby")).toBe("entry-disabled-reason");
  });

  it("calls onSubmit when register button is clicked", () => {
    const onSubmit = vi.fn();
    render(<TestWrapper onSubmit={onSubmit} isSubmitDisabled={false} />);
    const submitBtn = screen.getByTestId("register-entry");
    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalled();
  });

  it("hides plate input if noPlate is true", () => {
    render(<TestWrapper noPlate={true} />);
    expect(screen.queryByTestId("plate")).toBeNull();
  });
});
