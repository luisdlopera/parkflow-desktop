import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchDashboardSummary,
  fetchOperationalHealth,
  fetchActiveSessions,
  postOperationalAction,
} from "../dashboard-api";

vi.mock("@/lib/api", () => ({
  buildApiHeaders: () => Promise.resolve({ "Content-Type": "application/json" }),
}));

vi.mock("@/lib/api/config", () => ({
  opsBase: () => "http://localhost:6011/api/v1/operations",
  apiBase: () => "http://localhost:6011/api/v1",
}));

const mockFetch = vi.fn();
vi.mock("@/lib/api/fetch-with-credentials", () => ({
  fetchWithCredentials: (...args: unknown[]) => mockFetch(...args),
}));

function okResponse(data: unknown): Response {
  return {
    ok: true,
    json: () => Promise.resolve(data),
    status: 200,
  } as Response;
}

function errorResponse(): Response {
  return {
    ok: false,
    json: () => Promise.resolve({ error: "fail" }),
    status: 500,
  } as Response;
}

const MOCK_SUMMARY = {
  activeVehicles: 45,
  totalCapacity: 100,
  availableSpaces: 55,
  occupancyPercent: 45,
  entriesSinceMidnight: 30,
  exitsSinceMidnight: 20,
  reprintsSinceMidnight: 2,
  lostTicketSinceMidnight: 0,
  printFailedSinceMidnight: 1,
  printDeadLetterSinceMidnight: 0,
  syncQueuePending: 5,
};

const MOCK_HEALTH = {
  overallStatus: "OK",
  apiStatus: "OK",
  databaseStatus: "OK",
  printerStatus: "WARNING",
  lastHeartbeat: "2025-06-01T10:00:00Z",
  outboxPending: 3,
  failedEvents: 0,
  deadLetter: 0,
  lastSuccessfulSync: "2025-06-01T10:00:00Z",
  openCashRegisters: 2,
  recentErrors: [],
};

describe("dashboard-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchDashboardSummary", () => {
    it("should fetch dashboard summary", async () => {
      mockFetch.mockResolvedValue(okResponse(MOCK_SUMMARY));

      const result = await fetchDashboardSummary();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/operations/supervisor/summary"),
        expect.any(Object),
      );
      expect(result.activeVehicles).toBe(45);
    });

    it("should throw on error", async () => {
      mockFetch.mockResolvedValue(errorResponse());

      await expect(fetchDashboardSummary()).rejects.toThrow("No se pudo cargar resumen de supervisor");
    });
  });

  describe("fetchOperationalHealth", () => {
    it("should fetch operational health", async () => {
      mockFetch.mockResolvedValue(okResponse(MOCK_HEALTH));

      const result = await fetchOperationalHealth();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/health/operational"),
        expect.any(Object),
      );
      expect(result?.overallStatus).toBe("OK");
    });

    it("should return null when response is not ok", async () => {
      mockFetch.mockResolvedValue(errorResponse());

      const result = await fetchOperationalHealth();

      expect(result).toBeNull();
    });

    it("should return null on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network"));

      const result = await fetchOperationalHealth();

      expect(result).toBeNull();
    });
  });

  describe("fetchActiveSessions", () => {
    it("should fetch and unwrap paginated sessions", async () => {
      const sessions = [{ ticketNumber: "T001", plate: "ABC123", vehicleType: "CAR", entryAt: "2025-06-01T10:00:00Z", status: "ACTIVE", totalAmount: null }];
      mockFetch.mockResolvedValue(okResponse({ data: sessions }));

      const result = await fetchActiveSessions();

      expect(result).toEqual(sessions);
    });

    it("should return array directly when payload is array", async () => {
      const sessions = [{ ticketNumber: "T001", plate: "ABC123", vehicleType: "CAR", entryAt: "2025-06-01T10:00:00Z", status: "ACTIVE", totalAmount: null }];
      mockFetch.mockResolvedValue(okResponse(sessions));

      const result = await fetchActiveSessions();

      expect(result).toEqual(sessions);
    });

    it("should throw on error", async () => {
      mockFetch.mockResolvedValue(errorResponse());

      await expect(fetchActiveSessions()).rejects.toThrow("No se pudo listar sesiones activas");
    });
  });

  describe("postOperationalAction", () => {
    it("should POST retry-sync action", async () => {
      mockFetch.mockResolvedValue(okResponse({ message: "Sync iniciado" }));

      const result = await postOperationalAction("retry-sync");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/health/operational/retry-sync"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toBe("Sync iniciado");
    });

    it("should POST test-printer action", async () => {
      mockFetch.mockResolvedValue(okResponse({ message: "Impresión de prueba enviada" }));

      const result = await postOperationalAction("test-printer");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/health/operational/test-printer"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toBe("Impresión de prueba enviada");
    });

    it("should return default message when payload has no message", async () => {
      mockFetch.mockResolvedValue(okResponse({}));

      const result = await postOperationalAction("retry-sync");

      expect(result).toBe("Acción ejecutada");
    });
  });
});
