import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MixedEntryFormUI } from "../MixedEntryFormUI";
import { useForm } from "react-hook-form";
import React from "react";



vi.mock("@/components/bridge/Select", () => ({
  Select: Object.assign(({ children }: any) => <div>{children}</div>, {
    Trigger: () => null,
    Value: () => null,
    Indicator: () => null,
    Popover: ({ children }: any) => <div>{children}</div>
  })
}));

vi.mock("@/components/bridge/Input", () => ({
  Input: (props: any) => <input aria-label={props.label} {...props} />
}));

vi.mock("@/components/forms/PlateInput", () => ({
  default: () => <div data-testid="plate">Plate Input</div>
}));

vi.mock("@/components/forms/VehicleTypeSelector", () => ({
  default: () => <div data-testid="vehicle-type-selector">Vehicle Type Selector</div>
}));

function TestWrapper(props: any) {
  const form = useForm({
    defaultValues: {
      plate: "",
      entryMode: "VISITOR",
      noPlateReason: ""
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); (props.onSubmit || vi.fn())(); }}>
      <MixedEntryFormUI
        form={form as any}
        onSubmit={props.onSubmit || vi.fn()}
        plateInputRef={{ current: null }}
        noPlate={props.noPlate || false}
        platePrefix={props.platePrefix}
        flags={{ agreements: true, memberships: true }}
        vehicleTypes={[{ code: "CAR", name: "Carro" }, { code: "BICYCLE", name: "Bicicleta" }]}
        loadingTypes={false}
        isExpert={false}
        isSpeed={false}
        visibleQuickTypes={[]}
        selectedTypeCode={props.selectedTypeCode || "CAR"}
        isSubmitting={props.isSubmitting || false}
        printWarning={props.printWarning || null}
      />
    </form>
  );
}

describe("MixedEntryFormUI", () => {
  it("renders plate input when noPlate is false", () => {
    render(<TestWrapper noPlate={false} />);
    expect(screen.getByTestId("plate")).toBeDefined();
    expect(screen.queryByLabelText("Justificación sin placa")).toBeNull();
  });

  it("hides plate input and shows reason input when noPlate is true", () => {
    render(<TestWrapper noPlate={true} />);
    expect(screen.queryByTestId("plate")).toBeNull();
    expect(screen.getByLabelText("Justificación sin placa")).toBeDefined();
  });

  it("calls onSubmit when register button is clicked", () => {
    const onSubmit = vi.fn();
    render(<TestWrapper onSubmit={onSubmit} />);
    const submitBtn = screen.getByTestId("register-entry");
    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalled();
  });

  it("shows loading state when isSubmitting is true", () => {
    render(<TestWrapper isSubmitting={true} />);
    const submitBtn = screen.getByTestId("register-entry");
    expect(submitBtn.textContent).toContain("Registrando...");
  });
});
