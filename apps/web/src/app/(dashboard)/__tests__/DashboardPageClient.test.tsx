import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DashboardPageClient from "../DashboardPageClient";

vi.mock("@/lib/services/auth-domain.service", () => ({
  currentUser: vi.fn().mockResolvedValue({ id: "1", role: "SUPER_ADMIN" }),
  canAccessSuperAdminPortal: vi.fn().mockReturnValue(true),
}));

const mockRefreshAll = vi.fn();
const mockExecuteAction = vi.fn();

const defaultSummary = {
  activeVehicles: 15,
  totalCapacity: 100,
  availableSpaces: 85,
  occupancyPercent: 15,
  entriesSinceMidnight: 42,
  exitsSinceMidnight: 38,
  reprintsSinceMidnight: 2,
  lostTicketSinceMidnight: 0,
  printFailedSinceMidnight: 1,
  printDeadLetterSinceMidnight: 0,
  syncQueuePending: 3,
};

const defaultMetrics = {
  activeVehicles: { status: "OK" },
  availableSpaces: { status: "OK" },
  occupancyRate: { status: "OK" },
};

const defaultOperational = {
  apiStatus: "OK",
  databaseStatus: "OK",
  printerStatus: "WARNING",
  lastHeartbeat: "2026-06-22T10:00:00Z",
  lastSuccessfulSync: "2026-06-22T10:00:00Z",
  outboxPending: 0,
  deadLetter: 0,
  openCashRegisters: 2,
  failedEvents: 0,
  recentErrors: [],
};

const defaultSessions = [
  {
    ticketNumber: "T001",
    plate: "ABC123",
    vehicleType: "CAR",
    started: "2026-06-22T09:00:00Z",
    status: "ACTIVE",
  },
];

const baseHookReturn = {
  summary: defaultSummary,
  summaryError: null,
  summaryLoading: false,
  metrics: defaultMetrics,
  operational: defaultOperational,
  activeSessions: defaultSessions,
  sessionsError: null,
  opsMessage: null,
  lastUpdated: "2026-06-22T10:00:00Z",
  formatLastUpdated: (d: string) => d ?? "",
  refreshAll: mockRefreshAll,
  executeOperationalAction: mockExecuteAction,
};

vi.mock("@/features/dashboard/hooks/useDashboardData", () => ({
  useDashboardData: vi.fn(() => baseHookReturn),
}));

import { useDashboardData } from "@/features/dashboard/hooks/useDashboardData";

describe("DashboardPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDashboardData).mockReturnValue(baseHookReturn);
  });

  it("renders the dashboard root container", () => {
    render(<DashboardPageClient />);
    expect(screen.getByTestId("dashboard-root")).toBeInTheDocument();
  });

  it("renders KPI cards with summary data", () => {
    render(<DashboardPageClient />);
    expect(screen.getByText("Vision general del parqueadero")).toBeInTheDocument();
    expect(screen.getByText("Vehiculos activos")).toBeInTheDocument();
    expect(screen.getByText("Espacios disponibles")).toBeInTheDocument();
    expect(screen.getByText("Ingresos hoy")).toBeInTheDocument();
    expect(screen.getByText("Salidas hoy")).toBeInTheDocument();
  });

  it("renders status summary grid when summary is available", () => {
    render(<DashboardPageClient />);
    expect(screen.getByText("Sync pendiente")).toBeInTheDocument();
    expect(screen.getByText("Impresión fallida")).toBeInTheDocument();
    expect(screen.getByText("Dead letter")).toBeInTheDocument();
    expect(screen.getByText("Tickets perdidos")).toBeInTheDocument();
  });

  it("renders active sessions section", () => {
    render(<DashboardPageClient />);
    expect(screen.getByText("Vehículos en Patio")).toBeInTheDocument();
    expect(screen.getByText("ABC123")).toBeInTheDocument();
  });

  it("renders loading overlay when loading", () => {
    vi.mocked(useDashboardData).mockReturnValue({
      ...baseHookReturn,
      summary: null,
      summaryLoading: true,
      metrics: null,
      operational: null,
      activeSessions: [],
    });
    render(<DashboardPageClient />);
    expect(screen.getByText("Actualizando datos...")).toBeInTheDocument();
  });

  it("renders error message when summary fails", () => {
    vi.mocked(useDashboardData).mockReturnValue({
      ...baseHookReturn,
      summary: null,
      summaryError: "Error al cargar datos",
      metrics: null,
    });
    render(<DashboardPageClient />);
    expect(screen.getByText("Error al cargar datos")).toBeInTheDocument();
  });

  it("renders sessions error when sessions fail", () => {
    vi.mocked(useDashboardData).mockReturnValue({
      ...baseHookReturn,
      sessionsError: "No se pudieron cargar las sesiones",
    });
    render(<DashboardPageClient />);
    expect(
      screen.getByText("No se pudieron cargar las sesiones")
    ).toBeInTheDocument();
  });

  it("renders operational health section for super admin users", async () => {
    render(<DashboardPageClient />);
    await waitFor(() => {
      expect(screen.getByText("Salud Operacional")).toBeInTheDocument();
    });
    expect(screen.getByText("Estado API")).toBeInTheDocument();
    expect(screen.getByText("Base de datos")).toBeInTheDocument();
  });

  it("renders refresh button", () => {
    render(<DashboardPageClient />);
    expect(screen.getByText("Actualizar ahora")).toBeInTheDocument();
  });
});
