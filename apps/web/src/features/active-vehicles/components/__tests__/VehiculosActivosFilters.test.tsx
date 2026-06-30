import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VehiculosActivosFilters } from "../VehiculosActivosFilters";

const onFilterChange = vi.hoisted(() => vi.fn());

vi.mock("@heroui/react", () => ({
  Button: ({ children, isDisabled, onPress, ...props }: any) =>
    React.createElement("button", { disabled: isDisabled, onClick: onPress, "data-testid": "heroui-button", ...props }, children),
  Popover: Object.assign(({ children }: any) => React.createElement("div", { "data-testid": "popover" }, children), {
    Trigger: ({ children }: any) => React.createElement("div", { "data-testid": "popover-trigger" }, children),
    Content: ({ children }: any) => React.createElement("div", { "data-testid": "popover-content" }, children),
    Dialog: ({ children }: any) => React.createElement("div", { "data-testid": "popover-dialog" }, children),
  }),
  Badge: ({ children, content }: any) => React.createElement("span", { "data-testid": "badge" }, content ?? children),
}));

vi.mock("@/components/bridge/Select", () => ({
  Select: ({ value, onChange, children, ...props }: any) => (
    <select
      data-testid="vehicle-type-select"
      value={value}
      onChange={(e) => onChange(new Set([e.target.value]))}
      {...props}
    >
      {children}
    </select>
  ),
}));

const vehicleTypeOptions = [
  { label: "Todos", value: "all" },
  { label: "Automóvil", value: "AUTO" },
  { label: "Motocicleta", value: "MOTO" },
];

describe("VehiculosActivosFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders filter inputs", () => {
    render(
      <VehiculosActivosFilters
        filterValues={{}}
        onFilterChange={onFilterChange}
        vehicleTypeOptions={vehicleTypeOptions}
      />,
    );

    expect(screen.getByTestId("vehicle-type-select")).toBeInTheDocument();
    expect(screen.getByText("Aplicar filtros")).toBeInTheDocument();
  });

  it("triggers onChange when selecting a vehicle type", async () => {
    const user = userEvent.setup();
    render(
      <VehiculosActivosFilters
        filterValues={{ vehicleType: "all" }}
        onFilterChange={onFilterChange}
        vehicleTypeOptions={vehicleTypeOptions}
      />,
    );

    await user.selectOptions(screen.getByTestId("vehicle-type-select"), "MOTO");
    expect(onFilterChange).toHaveBeenCalledWith({ vehicleType: "MOTO" });
  });

  it("filters by vehicle type", () => {
    render(
      <VehiculosActivosFilters
        filterValues={{ vehicleType: "AUTO" }}
        onFilterChange={onFilterChange}
        vehicleTypeOptions={vehicleTypeOptions}
      />,
    );

    const autoElements = screen.getAllByText("Automóvil");
    expect(autoElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("badge")).toHaveTextContent("1");
  });

  it("clears filters when Limpiar todo is clicked", async () => {
    const user = userEvent.setup();
    render(
      <VehiculosActivosFilters
        filterValues={{ vehicleType: "AUTO" }}
        onFilterChange={onFilterChange}
        vehicleTypeOptions={vehicleTypeOptions}
      />,
    );

    const clearBtn = screen.getByText("Limpiar todo");
    expect(clearBtn).toBeInTheDocument();

    await user.click(clearBtn);
    expect(onFilterChange).toHaveBeenCalledWith({ vehicleType: "all" });
  });

  it("disables filter button when loading", () => {
    render(
      <VehiculosActivosFilters
        filterValues={{}}
        onFilterChange={onFilterChange}
        vehicleTypeOptions={vehicleTypeOptions}
        isLoading={true}
      />,
    );

    const buttons = screen.getAllByTestId("heroui-button");
    const filterBtn = buttons.find((b) => b.textContent?.includes("Filtros"));
    expect(filterBtn).toBeDisabled();
  });
});
