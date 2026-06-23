import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import VehiculosActivosClient from "../VehiculosActivosClient";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
}));

const defaultSessionReturn = {
  rows: [
    { ticketNumber: "T001", plate: "ABC123", vehicleType: "CAR", parkingSpaceCode: "A1", status: "ACTIVE" },
    { ticketNumber: "T002", plate: "XYZ789", vehicleType: "MOTORCYCLE", status: "ACTIVE" },
  ],
  meta: { total: 2, page: 1, pageSize: 25 },
  summary: { activeSpaces: 100, availableSpaces: 85 },
  loading: false,
  error: null,
  reload: vi.fn(),
};

vi.mock("@/features/cash-register/hooks/useTerminalCaja", () => ({
  useTerminalCaja: vi.fn().mockReturnValue({
    caja: { status: "open", reason: null },
    requireOpenForPayment: true,
  }),
}));

vi.mock("@/providers/TenantConfigProvider", () => ({
  useTenantConfig: vi.fn().mockReturnValue({
    runtimeConfig: {
      operationConfiguration: { enableCustodiedItem: true },
      vehicleTypes: ["CAR", "MOTORCYCLE"],
      tickets: { allowReprint: true },
    },
  }),
}));

vi.mock("@/features/active-vehicles/hooks/useBulkExit", () => ({
  useBulkExit: vi.fn().mockReturnValue({
    selectedKeys: new Set(),
    setSelectedKeys: vi.fn(),
    precalculation: null,
    finalResult: null,
    isCalculating: false,
    isProcessing: false,
    hasSelection: false,
    selectionCount: 0,
    availablePaymentMethods: ["CASH"],
    selectedPaymentMethod: "CASH",
    setSelectedPaymentMethod: vi.fn(),
    handleCalculate: vi.fn(),
    handleConfirm: vi.fn(),
    closeModal: vi.fn(),
  }),
}));

vi.mock("@/features/active-vehicles/hooks/useColumnVisibility", () => ({
  useColumnVisibility: vi.fn().mockReturnValue({
    visible: new Set(["plate", "ticketNumber", "vehicleType", "parkingSpaceCode", "actions"]),
    toggleColumn: vi.fn(),
    isVisible: (key: string) => true,
    resetColumns: vi.fn(),
    columns: [
      { key: "plate", label: "Placa" },
      { key: "ticketNumber", label: "Ticket" },
      { key: "vehicleType", label: "Tipo" },
      { key: "parkingSpaceCode", label: "Celda" },
      { key: "actions", label: "" },
    ],
  }),
}));

vi.mock("@/features/active-vehicles/components/VehiculosActivosFilters", () => ({
  VehiculosActivosFilters: () => <div data-testid="active-vehicles-filters" />,
}));

vi.mock("@/features/active-vehicles/components/TicketPreviewModal", () => ({
  TicketPreviewModal: () => <div data-testid="ticket-preview-modal" />,
}));

vi.mock("@/features/active-vehicles/components/BulkExitModals", () => ({
  BulkExitConfirmModal: () => <div data-testid="bulk-exit-confirm" />,
  BulkExitSuccessModal: () => <div data-testid="bulk-exit-success" />,
}));

vi.mock("@/lib/api/lockers-api", () => ({
  fetchLockers: vi.fn().mockResolvedValue([]),
}));

let activeSessionsMock = { ...defaultSessionReturn };

vi.mock("@/features/active-vehicles/hooks/useActiveSessions", () => ({
  useActiveSessions: vi.fn(() => activeSessionsMock),
}));

describe("VehiculosActivosClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeSessionsMock = { ...defaultSessionReturn };
  });

  it("renders page header with title", () => {
    render(<VehiculosActivosClient />);
    expect(screen.getByText("Vehículos Activos")).toBeInTheDocument();
  });

  it("renders summary occupancy cards", () => {
    render(<VehiculosActivosClient />);
    expect(screen.getByText("Ocupados")).toBeInTheDocument();
    expect(screen.getByText("Disponibles")).toBeInTheDocument();
  });

  it("renders filter controls", () => {
    render(<VehiculosActivosClient />);
    expect(screen.getByTestId("active-vehicles-filters")).toBeInTheDocument();
  });

  it("renders session rows in the table", () => {
    render(<VehiculosActivosClient />);
    expect(screen.getByText("ABC123")).toBeInTheDocument();
    expect(screen.getByText("XYZ789")).toBeInTheDocument();
  });

  it("renders refresh and update button", () => {
    render(<VehiculosActivosClient />);
    expect(screen.getByText("Actualizar")).toBeInTheDocument();
  });

  it("shows error message when sessions fail to load", () => {
    activeSessionsMock = {
      rows: [],
      meta: null,
      summary: null,
      loading: false,
      error: "Error de conexión",
      reload: vi.fn(),
    };
    render(<VehiculosActivosClient />);
    expect(screen.getByText("Error de conexión")).toBeInTheDocument();
  });
});
