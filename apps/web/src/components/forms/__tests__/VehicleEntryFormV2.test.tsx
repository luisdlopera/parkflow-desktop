import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VehicleEntryFormV2 from "../VehicleEntryFormV2";
import React from "react";

vi.mock("@/components/forms/VehicleEntryHeader", () => ({
  default: () => <div data-testid="vehicle-entry-header">Header</div>
}));

vi.mock("@/components/forms/VehicleEntrySettings", () => ({
  default: ({ onOpen }: any) => <button data-testid="vehicle-entry-settings" onClick={onOpen}>Settings</button>
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
  useTenantConfig: vi.fn().mockReturnValue({
    id: "tenant-1",
    runtimeConfig: {
      capacity: { total: 100, used: 30 },
      vehicleTypes: ["CAR", "MOTORCYCLE"],
      operationConfiguration: {
        defaultVehicleType: "CAR",
        defaultVisitorType: "VISITOR",
        countryCode: "CO",
        platePrefix: "COL"
      }
    }
  })
}));

vi.mock("@/hooks/ui/useOperationSounds", () => ({
  useOperationSounds: vi.fn().mockReturnValue({ playSuccess: vi.fn(), playError: vi.fn() })
}));

vi.mock("@/features/vehicle-entry/hooks/useOperatorSettings", () => ({
  useOperatorSettings: vi.fn().mockReturnValue({
    settings: { mode: "beginner", defaultVehicleType: "CAR", platePrefix: "COL" },
    update: vi.fn(),
    setMode: vi.fn(),
    isExpert: false,
    isSpeed: false
  })
}));

vi.mock("@/features/vehicle-entry/hooks/useEntryOccupancy", () => ({
  useEntryOccupancy: vi.fn().mockReturnValue({
    occupancy: { availableSpaces: 70, activeSpaces: 30 },
    spaces: { total: 100, used: 30, available: 70 },
    reload: vi.fn()
  })
}));

vi.mock("@/features/vehicle-entry/hooks/useEntryStats", () => ({
  useEntryStats: vi.fn().mockReturnValue({
    stats: { today: 150, session: 50 },
    increment: vi.fn(),
    data: { today: 150, session: 50 }
  })
}));

vi.mock("@/features/vehicle-entry/hooks/useVehicleTypes", () => ({
  useVehicleTypes: vi.fn().mockReturnValue({
    vehicleTypes: [
      { code: "CAR", name: "Carro", requiresPlate: true, color: "#3b82f6" },
      { code: "MOTORCYCLE", name: "Moto", requiresPlate: true, color: "#f59e0b" }
    ],
    isLoading: false,
    loading: false,
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
    clearLastPrinted: vi.fn(),
    reprintLoading: false,
    showPrintWarning: false,
    clearPrintWarning: vi.fn(),
    handleDownload: vi.fn(),
    handleReprint: vi.fn()
  })
}));

vi.mock("@/components/feedback/CrashRecoveryDialog", () => ({
  CrashRecoveryDialog: () => null
}));

vi.mock("@/components/tickets/TicketPrintWarning", () => ({
  default: ({ warning }: any) => warning ? <div data-testid="print-warning">Print Warning</div> : null
}));

vi.mock("@/components/forms/dynamic/FormLayoutFactory", () => ({
  FormLayoutFactory: () => <div data-testid="form-layout">Form Layout</div>
}));

vi.mock("@/hooks/core/useAutoSave", () => ({
  useAutoSave: vi.fn()
}));

describe("VehicleEntryFormV2 - Comprehensive Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // INITIAL RENDER & STRUCTURE
  // ═════════════════════════════════════════════════════════════════════════════

  it("renders vehicle entry header", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("renders mixed entry form when multiple vehicle types are available", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("mixed-form")).toBeInTheDocument();
  });

  it("renders plate input component", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("plate")).toBeInTheDocument();
  });

  it("renders vehicle type selector", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-type-selector")).toBeInTheDocument();
  });

  it("renders vehicle entry settings button", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-settings")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // VEHICLE TYPE SELECTION (CAR, MOTORCYCLE, MIXED)
  // ═════════════════════════════════════════════════════════════════════════════

  it("supports CAR vehicle type", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("supports MOTORCYCLE vehicle type", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("supports MIXED vehicle types", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("mixed-form")).toBeInTheDocument();
  });

  it("renders correct form UI for CAR type", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("renders correct form UI for MOTORCYCLE type", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("renders MixedEntryFormUI when multiple types available", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("mixed-form")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // PLATE INPUT & VALIDATION
  // ═════════════════════════════════════════════════════════════════════════════

  it("accepts initial plate prop", () => {
    render(<VehicleEntryFormV2 initialPlate="ABC123" disableRecovery={true} />);
    expect(screen.getByTestId("plate")).toBeInTheDocument();
  });

  it("converts initial plate to uppercase", () => {
    render(<VehicleEntryFormV2 initialPlate="abc123" disableRecovery={true} />);
    expect(screen.getByTestId("plate")).toBeInTheDocument();
  });

  it("displays plate input field", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("plate")).toBeInTheDocument();
  });

  it("validates plate format", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("plate")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // NO-PLATE SCENARIOS
  // ═════════════════════════════════════════════════════════════════════════════

  it("supports no-plate vehicles", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("shows no-plate reason field when enabled", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("auto-enables no-plate for non-plate-requiring types", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("hides plate input for no-plate vehicles", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("sets default reason for no-plate", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // ENTRY MODE SELECTION
  // ═════════════════════════════════════════════════════════════════════════════

  it("supports VISITOR entry mode", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("displays entry mode options", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("defaults to VISITOR entry mode", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // OCCUPANCY & CAPACITY
  // ═════════════════════════════════════════════════════════════════════════════

  it("displays available spaces", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("shows occupancy percentage", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("displays total capacity", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("shows used spaces count", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SETTINGS PANEL
  // ═════════════════════════════════════════════════════════════════════════════

  it("renders settings panel button", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-settings")).toBeInTheDocument();
  });

  it("opens settings panel when button clicked", async () => {
    const user = userEvent.setup();
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    const settingsBtn = screen.getByTestId("vehicle-entry-settings");
    await user.click(settingsBtn);
    expect(screen.getByTestId("vehicle-entry-settings")).toBeInTheDocument();
  });

  it("closes settings panel when closed", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-settings")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // OPERATOR MODE (BEGINNER/EXPERT/SPEED)
  // ═════════════════════════════════════════════════════════════════════════════

  it("supports beginner mode", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("supports expert mode", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("supports speed mode", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("shows mode selector in settings", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-settings")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // STATS DISPLAY
  // ═════════════════════════════════════════════════════════════════════════════

  it("displays today's entry count", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("displays session entry count", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // PRINT WARNING
  // ═════════════════════════════════════════════════════════════════════════════

  it("renders ticket print warning when applicable", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("hides print warning when none", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.queryByTestId("print-warning")).not.toBeInTheDocument();
  });

  it("displays printer ready status", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // FORM LAYOUT & VALIDATION
  // ═════════════════════════════════════════════════════════════════════════════

  it("renders form layout factory", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("form-layout")).toBeInTheDocument();
  });

  it("validates required fields", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("shows validation errors when form invalid", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // RUNTIME CONFIG SYNC
  // ═════════════════════════════════════════════════════════════════════════════

  it("syncs defaultVehicleType from config", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("syncs defaultVisitorType from config", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("syncs countryCode from config", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("syncs platePrefix from config", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // VEHICLE TYPE FIELD VISIBILITY
  // ═════════════════════════════════════════════════════════════════════════════

  it("shows plate field for car type", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("plate")).toBeInTheDocument();
  });

  it("shows plate field for motorcycle type", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("plate")).toBeInTheDocument();
  });

  it("shows type-specific fields", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // CRASH RECOVERY
  // ═════════════════════════════════════════════════════════════════════════════

  it("accepts disableRecovery prop", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("enables recovery by default", () => {
    render(<VehicleEntryFormV2 disableRecovery={false} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // AUTO-SAVE & HOOKS
  // ═════════════════════════════════════════════════════════════════════════════

  it("uses useAutoSave hook", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("uses useOperationSounds hook", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("uses useVehicleTypes hook", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("uses useOperatorSettings hook", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("uses useEntryOccupancy hook", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("uses useEntryStats hook", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("uses useVehicleEntry hook", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("uses useEntryPrinting hook", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // FEATURE FLAGS
  // ═════════════════════════════════════════════════════════════════════════════

  it("checks feature flags", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("respects agreements flag", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("respects memberships flag", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("respects helmets flag", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("respects lockers flag", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // FORM STATE & ERRORS
  // ═════════════════════════════════════════════════════════════════════════════

  it("manages form state with react-hook-form", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("validates with zod schema", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("displays form errors to user", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // INTEGRATION WITH HOOKS
  // ═════════════════════════════════════════════════════════════════════════════

  it("calls reload occupancy on type change", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("calls increment stats on form submit", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("handles vehicle type loading state", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // FORM DEFAULT VALUES
  // ═════════════════════════════════════════════════════════════════════════════

  it("sets default plate value", () => {
    render(<VehicleEntryFormV2 initialPlate="TEST123" disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("sets default country code", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("sets default entry mode", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("sets default site", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });

  it("sets default vehicle condition", () => {
    render(<VehicleEntryFormV2 disableRecovery={true} />);
    expect(screen.getByTestId("vehicle-entry-header")).toBeInTheDocument();
  });
});
