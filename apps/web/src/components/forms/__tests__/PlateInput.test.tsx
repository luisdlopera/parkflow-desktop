import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PlateInput from "../PlateInput";
import React from "react";

vi.mock("react-hook-form", () => ({
  Controller: ({ render }: any) => {
    const fieldState = { error: null, invalid: false };
    const field = {
      value: "",
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn(),
      name: "plate",
    };
    return render({ field, fieldState, formState: { errors: {} } });
  },
}));

function createPlateInput(overrides: Record<string, any> = {}) {
  return (
    <PlateInput control={{}} plateInputRef={{ current: null }} {...overrides} />
  );
}

describe("PlateInput", () => {
  it("renders input field with placeholder", () => {
    render(createPlateInput());
    const input = screen.getByTestId("plate");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder");
  });

  it("shows format hint text", () => {
    render(createPlateInput());
    expect(screen.getByText(/Formato esperado/)).toBeInTheDocument();
  });

  it("disables input when noPlate is true", () => {
    render(createPlateInput({ noPlate: true }));
    const input = screen.getByTestId("plate");
    expect(input).toBeDisabled();
  });

  it("shows plate prefix when provided", () => {
    render(createPlateInput({ platePrefix: "MOTO" }));
    expect(screen.getByText("MOTO")).toBeInTheDocument();
  });
});
