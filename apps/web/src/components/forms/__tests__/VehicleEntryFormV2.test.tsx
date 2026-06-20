import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import VehicleEntryFormV2 from "../VehicleEntryFormV2";
import React from "react";

vi.mock("@/components/forms/VehicleEntryHeader", () => ({
  default: () => <div data-testid="vehicle-entry-header">Header</div>
}));

vi.mock("@/components/forms/VehicleEntrySettings", () => ({
  default: () => <div data-testid="vehicle-entry-settings">Settings</div>
}));

vi.mock("@/components/forms/PlateInput", () => ({
  default: () => <div data-testid="plate">Plate Input</div>
}));

vi.mock("@/components/forms/VehicleTypeSelector", () => ({
  default: () => <div data-testid="vehicle-type-selector">Vehicle Type Selector</div>
}));

vi.mock("@/components/forms/mixed/MixedEntryFormUI", () => ({
  MixedEntryFormUI: () => <div data-testid="mixed-form">Tipo de Vehículo</div>
}));

vi.mock("@/components/forms/car/CarEntryFormUI", () => ({
  CarEntryFormUI: () => <div data-testid="car-form">Car Form</div>
}));

vi.mock("@/components/forms/motorcycle/MotorcycleEntryFormUI", () => ({
  MotorcycleEntryFormUI: () => <div data-testid="motorcycle-form">Motorcycle Form</div>
}));

vi.mock("@/components/providers/FeatureFlagProvider", () => ({
  useFeatureFlags: vi.fn().mockReturnValue({ agreements: true, memberships: true, helmets: true, lockers: true })
}));

vi.mock("@/providers/TenantConfigProvider", () => ({
  useTenantConfig: vi.fn().mockReturnValue({ id: "tenant-1" })
}));

vi.mock("@/hooks/ui/useOperationSounds", () => ({
  useOperationSounds: vi.fn().mockReturnValue({ playSuccess: vi.fn(), playError: vi.fn() })
}));

vi.mock("@/features/vehicle-entry/hooks/useOperatorSettings", () => ({
  useOperatorSettings: vi.fn().mockReturnValue({ settings: { mode: "beginner", defaultVehicleType: "CAR" }, setMode: vi.fn(), isExpert: false, isSpeed: false })
}));

vi.mock("@/features/vehicle-entry/hooks/useEntryOccupancy", () => ({
  useEntryOccupancy: vi.fn().mockReturnValue({ data: { availableSpaces: 10, activeSpaces: 5 } })
}));

vi.mock("@/features/vehicle-entry/hooks/useEntryStats", () => ({
  useEntryStats: vi.fn().mockReturnValue({ data: { today: 15, session: 5 } })
}));

vi.mock("@/features/vehicle-entry/hooks/useVehicleTypes", () => ({
  useVehicleTypes: vi.fn().mockReturnValue({
    vehicleTypes: [{ code: "CAR", name: "Carro" }, { code: "MOTORCYCLE", name: "Moto" }],
    isLoading: false,
    visibleQuickTypes: [{ code: "CAR", name: "Carro" }]
  })
}));

vi.mock("@/features/vehicle-entry/hooks/useVehicleEntry", () => ({
  useVehicleEntry: vi.fn().mockReturnValue({
    submitEntry: vi.fn(),
    isPending: false
  })
}));

vi.mock("@/features/vehicle-entry/hooks/useEntryPrinting", () => ({
  useEntryPrinting: vi.fn().mockReturnValue({
    printWarning: null,
    isReady: true,
    lastPrintedId: null,
    clearLastPrinted: vi.fn()
  })
}));

describe("VehicleEntryFormV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders mixed entry form when multiple vehicle types are available", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    // "Tipo de Vehículo" is rendered in MixedEntryFormUI
    expect(screen.getByText("Tipo de Vehículo")).toBeDefined();
  });
});
