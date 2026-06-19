import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DashboardPageClient from "@/app/(dashboard)/DashboardPageClient";

vi.mock("@/lib/api", () => ({
  buildApiHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test-token", "X-API-Key": "test-key" }),
}));

vi.mock("@/lib/auth", () => ({
  currentUser: vi.fn().mockResolvedValue({ id: "123", role: "ADMIN" }),
  canAccessSuperAdminPortal: vi.fn().mockReturnValue(true),
}));

const now = new Date("2026-05-26T10:00:00Z").toISOString();

function buildSummary(overrides = {}) {
  return {
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
    ...overrides,
  };
}

function buildOperational(overrides = {}) {
  return {
    overallStatus: "OK",
    apiStatus: "OK",
    databaseStatus: "OK",
    printerStatus: "OK",
    lastHeartbeat: now,
    outboxPending: 0,
    failedEvents: 0,
    deadLetter: 0,
    lastSuccessfulSync: now,
    openCashRegisters: 2,
    recentErrors: [],
    ...overrides,
  };
}

function buildActiveSessions(overrides: any[] = []) {
  return overrides.length > 0 ? overrides : [
    { ticketNumber: "T-001", plate: "ABC123", vehicleType: "CAR", entryAt: "2026-05-26T09:30:00Z", status: "ACTIVE", totalAmount: null },
    { ticketNumber: "T-002", plate: "XYZ789", vehicleType: "MOTORCYCLE", entryAt: "2026-05-26T09:45:00Z", status: "ACTIVE", totalAmount: null },
  ];
}

describe("DashboardPageClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.toString().includes("print-agent")) {
        return { ok: true, json: async () => ({ ok: true }) };
      }
      if (url.toString().includes("supervisor/summary")) {
        return { ok: true, json: async () => buildSummary() };
      }
      if (url.toString().includes("health/operational")) {
        return { ok: true, json: async () => buildOperational() };
      }
      if (url.toString().includes("sessions/active-list") || url.toString().includes("active-list")) {
        return { ok: true, json: async () => buildActiveSessions() };
      }
      return { ok: true, json: async () => ({}) };
    }));
  });

  it("renders the dashboard root element", async () => {
    render(<DashboardPageClient />);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-root")).toBeDefined();
    });
  });

  it("renders KPI cards when summary data loads successfully", async () => {
    render(<DashboardPageClient />);

    await waitFor(() => {
      expect(screen.getByText("15")).toBeDefined();
      expect(screen.getByText("85")).toBeDefined();
      expect(screen.getByText("42")).toBeDefined();
      expect(screen.getByText("38")).toBeDefined();
    });
  });

  it("shows sync pending and print failure info", async () => {
    render(<DashboardPageClient />);

    await waitFor(() => {
      expect(screen.getByText(/Sync pendiente: 3/)).toBeDefined();
      expect(screen.getByText(/Impresion fallida: 1/)).toBeDefined();
    });
  });

  it("shows KPI cards with correct format", async () => {
    render(<DashboardPageClient />);

    await waitFor(() => {
      expect(screen.getByText("15%")).toBeDefined();
      const twos = screen.getAllByText("2");
      expect(twos.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows sync pending info in the header", async () => {
    render(<DashboardPageClient />);

    await waitFor(() => {
      const info = screen.getByText(/Sync pendiente/);
      expect(info.textContent).toContain("3");
      expect(info.textContent).toContain("1");
    });
  });

  it("shows error message when summary API fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.toString().includes("print-agent")) {
        return { ok: true, json: async () => ({ ok: true }) };
      }
      if (url.toString().includes("supervisor/summary")) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      if (url.toString().includes("health/operational")) {
        return { ok: true, json: async () => buildOperational() };
      }
      if (url.toString().includes("active-list")) {
        return { ok: true, json: async () => buildActiveSessions() };
      }
      return { ok: true, json: async () => ({}) };
    }));

    render(<DashboardPageClient />);

    await waitFor(() => {
      expect(screen.getByText("API no disponible (resumen)")).toBeDefined();
    });
  });

  it("shows API unavailable message when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network error"); }));

    render(<DashboardPageClient />);

    await waitFor(() => {
      expect(screen.getByText("API no disponible (resumen)")).toBeDefined();
    });
  });

  it("renders operational health section", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.toString().includes("print-agent")) {
        return { ok: true, json: async () => ({ ok: true }) };
      }
      if (url.toString().includes("supervisor/summary")) {
        return { ok: true, json: async () => buildSummary() };
      }
      if (url.toString().includes("health/operational")) {
        return { ok: true, json: async () => buildOperational({
          apiStatus: "OK",
          databaseStatus: "WARNING",
          printerStatus: "CRITICAL",
          outboxPending: 5,
          deadLetter: 1,
        }) };
      }
      if (url.toString().includes("active-list")) {
        return { ok: true, json: async () => buildActiveSessions() };
      }
      return { ok: true, json: async () => ({}) };
    }));

    render(<DashboardPageClient />);

    await waitFor(() => {
      expect(screen.getByText("OK")).toBeDefined();
      expect(screen.getByText("5")).toBeDefined();
      expect(screen.getByText("1")).toBeDefined();
    });
  });

  it("renders active vehicles table with session data", async () => {
    render(<DashboardPageClient />);

    await waitFor(() => {
      expect(screen.getByText("Vehículos en Patio")).toBeDefined();
    });
  });

  it("shows empty message when no active sessions", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.toString().includes("print-agent")) {
        return { ok: true, json: async () => ({ ok: true }) };
      }
      if (url.toString().includes("supervisor/summary")) {
        return { ok: true, json: async () => buildSummary() };
      }
      if (url.toString().includes("health/operational")) {
        return { ok: true, json: async () => buildOperational() };
      }
      if (url.toString().includes("active-list")) {
        return { ok: true, json: async () => [] };
      }
      return { ok: true, json: async () => ({}) };
    }));

    render(<DashboardPageClient />);

    await waitFor(() => {
      const msgs = screen.getAllByText("No hay vehículos activos en este momento.");
      expect(msgs.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows sessions error when active-list API fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.toString().includes("print-agent")) {
        return { ok: true, json: async () => ({ ok: true }) };
      }
      if (url.toString().includes("supervisor/summary")) {
        return { ok: true, json: async () => buildSummary() };
      }
      if (url.toString().includes("health/operational")) {
        return { ok: true, json: async () => buildOperational() };
      }
      if (url.toString().includes("active-list")) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return { ok: true, json: async () => ({}) };
    }));

    render(<DashboardPageClient />);

    await waitFor(() => {
      expect(screen.getByText("API no disponible (sesiones activas)")).toBeDefined();
    });
  });
});
