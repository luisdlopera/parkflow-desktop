import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VehicleTypeSelector from "../VehicleTypeSelector";
import React from "react";

function createMockControl() {
  return {
    register: vi.fn(),
    unregister: vi.fn(),
    getFieldState: vi.fn(),
    _names: { mount: new Set(), unMount: new Set(), array: new Set(), watch: new Set() },
    _formValues: {},
    _defaultValues: {},
    getValues: vi.fn(),
    setValue: vi.fn(),
    trigger: vi.fn(),
    formState: { errors: {} },
  } as any;
}

const mockVehicleTypes = [
  { code: "CAR", name: "Carro", color: "#ff0000" },
  { code: "MOTORCYCLE", name: "Moto", color: "#00ff00" },
  { code: "TRUCK", name: "Camión", color: "#0000ff" },
];

describe("VehicleTypeSelector", () => {
  it("renders nothing when only one vehicle type", () => {
    const control = createMockControl();
    const { container } = render(
      <VehicleTypeSelector
        vehicleTypes={[{ code: "CAR", name: "Carro" }]}
        visibleQuickTypes={[{ code: "CAR", name: "Carro" }]}
        control={control}
        setValue={vi.fn()}
        trigger={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows loading skeleton when loadingTypes is true", () => {
    const control = createMockControl();
    const { container } = render(
      <VehicleTypeSelector
        vehicleTypes={mockVehicleTypes}
        visibleQuickTypes={mockVehicleTypes}
        control={control}
        setValue={vi.fn()}
        trigger={vi.fn()}
        loadingTypes
      />
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders quick type buttons in expert mode", () => {
    const control = createMockControl();
    render(
      <VehicleTypeSelector
        vehicleTypes={mockVehicleTypes}
        visibleQuickTypes={mockVehicleTypes}
        control={control}
        setValue={vi.fn()}
        trigger={vi.fn()}
        isExpert
      />
    );
    expect(screen.getByText("Carro")).toBeInTheDocument();
    expect(screen.getByText("Moto")).toBeInTheDocument();
    expect(screen.getByText("Camión")).toBeInTheDocument();
  });

  it("highlights selected type in expert mode", () => {
    const control = createMockControl();
    render(
      <VehicleTypeSelector
        vehicleTypes={mockVehicleTypes}
        visibleQuickTypes={mockVehicleTypes}
        control={control}
        setValue={vi.fn()}
        trigger={vi.fn()}
        isExpert
        selectedTypeCode="MOTORCYCLE"
      />
    );
    const buttons = screen.getAllByRole("button");
    const motoIndex = mockVehicleTypes.findIndex((t) => t.code === "MOTORCYCLE");
    expect(buttons[motoIndex]).toHaveStyle({ backgroundColor: "#00ff00" });
  });

  it("calls setValue when quick type is clicked in expert mode", async () => {
    const setValue = vi.fn();
    const trigger = vi.fn();
    const control = createMockControl();
    render(
      <VehicleTypeSelector
        vehicleTypes={mockVehicleTypes}
        visibleQuickTypes={mockVehicleTypes}
        control={control}
        setValue={setValue}
        trigger={trigger}
        isExpert
      />
    );
    const carroBtn = screen.getByText("Carro");
    await userEvent.click(carroBtn);
    expect(setValue).toHaveBeenCalledWith("type", "CAR", { shouldValidate: true, shouldDirty: true });
    expect(trigger).toHaveBeenCalledWith("plate");
  });
});
