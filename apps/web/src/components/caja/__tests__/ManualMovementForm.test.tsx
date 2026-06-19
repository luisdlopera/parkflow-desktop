import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useForm, FormProvider } from "react-hook-form";
import ManualMovementForm from "../ManualMovementForm";

// Helper component to provide react-hook-form context
const FormWrapper = ({ p, contains }: any) => {
  const manualForm = useForm({
    defaultValues: {
      manualType: "",
      manualMethod: "",
      manualAmount: "",
      manualReason: "",
    }
  });
  
  // Attach the real hook form to the mock 'p' object
  const mergedP = {
    ...p,
    manualForm,
  };

  return (
    <FormProvider {...manualForm}>
      <ManualMovementForm p={mergedP} contains={contains} />
    </FormProvider>
  );
};

describe("ManualMovementForm", () => {
  it("renders correctly and allows submitting a manual movement", async () => {
    const mockOnAddManual = vi.fn().mockResolvedValue(true);
    const mockOnPrintLastMovement = vi.fn().mockResolvedValue(true);

    const mockP = {
      perms: { canMove: true },
      busy: false,
      allMovements: [],
      onAddManual: mockOnAddManual,
      onPrintLastMovement: mockOnPrintLastMovement,
    };

    const mockContains = vi.fn().mockReturnValue(true);

    render(<FormWrapper p={mockP} contains={mockContains} />);

    // Check title
    expect(screen.getByText("Ingreso / egreso manual")).toBeDefined();

    // The buttons
    const submitBtn = screen.getByText("Registrar movimiento");
    expect(submitBtn).toBeDefined();
    
    // Fire submission
    fireEvent.click(submitBtn);

    // Ensure it calls onAddManual
    await waitFor(() => {
      expect(mockOnAddManual).toHaveBeenCalled();
    });
  });

  it("disables inputs when user does not have canMove permission", () => {
    const mockP = {
      perms: { canMove: false },
      busy: false,
      allMovements: [],
      onAddManual: vi.fn(),
      onPrintLastMovement: vi.fn(),
    };

    render(<FormWrapper p={mockP} contains={vi.fn()} />);

    const submitBtn = screen.getByText("Registrar movimiento") as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });
});
