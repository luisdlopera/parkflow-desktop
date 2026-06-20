import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MotorcycleEntryFormUI } from "../MotorcycleEntryFormUI";
import { useForm } from "react-hook-form";
import React from "react";

vi.mock("@/components/providers/FeatureFlagProvider", () => ({
  useFeatureFlags: vi.fn().mockReturnValue({ helmets: true, lockers: true })
}));

vi.mock("@/lib/api/lockers-api", () => ({
  fetchAvailableLockers: vi.fn().mockResolvedValue([{ id: "1", code: "L-01" }])
}));

function TestWrapper(props: any) {
  const form = useForm({
    defaultValues: {
      plate: "",
      entryMode: "VISITOR",
      custodiedItems: []
    },
  });

  return (
    <MotorcycleEntryFormUI
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

describe("MotorcycleEntryFormUI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders plate input", () => {
    render(<TestWrapper />);
    expect(screen.getByTestId("plate")).toBeDefined();
  });

  it("shows disabled submit banner when submit is disabled", () => {
    render(<TestWrapper isSubmitDisabled={true} submitDisabledReason="Falta placa" />);
    const banner = screen.getByTestId("entry-status-banner");
    expect(banner.textContent).toContain("Falta placa");
    const submitBtn = screen.getByTestId("register-entry");
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
  });

  it("calls onSubmit when register button is clicked", () => {
    const onSubmit = vi.fn();
    render(<TestWrapper onSubmit={onSubmit} isSubmitDisabled={false} />);
    const submitBtn = screen.getByTestId("register-entry");
    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalled();
  });

  it("renders helmet management section when feature flag is enabled", () => {
    render(<TestWrapper />);
    expect(screen.getByText("Gestión de Cascos")).toBeDefined();
    expect(screen.getByText("Deja Casco(s)")).toBeDefined();
    expect(screen.getByText("Lleva el Casco")).toBeDefined();
  });

  it("adds a helmet field when Deja Cascos is clicked", async () => {
    render(<TestWrapper />);
    const leaveBtn = screen.getByText("Deja Casco(s)");
    fireEvent.click(leaveBtn.closest("button")!);
    
    // Wait for the field to appear
    expect(await screen.findByText("Cantidad a guardar:")).toBeDefined();
  });
});
