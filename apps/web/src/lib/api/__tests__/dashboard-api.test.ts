import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchDashboardSummary,
  fetchOperationalHealth,
  fetchActiveSessions,
  postOperationalAction,
} from "../dashboard-api";
import { apiFetch } from "../_shared";

vi.mock("@/lib/api", () => ({
  buildApiHeaders: () => Promise.resolve({ "Content-Type": "application/json" }),
}));

vi.mock("@/lib/api/config", () => ({
  opsBase: () => "http://localhost:6011/api/v1/operations",
  apiBase: () => "http://localhost:6011/api/v1",
}));

vi.mock("../_shared", () => ({
  apiFetch: vi.fn(),
}));

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
      vi.mocked(apiFetch).mockResolvedValue(MOCK_SUMMARY as never);

      const result = await fetchDashboardSummary();

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/operations/supervisor/summary"),
        expect.any(Object),
      );
      expect(result.activeVehicles).toBe(45);
    });

    it("should throw on error", async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error("fail"));

      await expect(fetchDashboardSummary()).rejects.toThrow("fail");
    });
  });

  describe("fetchOperationalHealth", () => {
    it("should fetch operational health", async () => {
      vi.mocked(apiFetch).mockResolvedValue(MOCK_HEALTH as never);

      const result = await fetchOperationalHealth();

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/health/operational"),
        expect.any(Object),
      );
      expect(result?.overallStatus).toBe("OK");
    });

    it("should return null on network error", async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error("Network"));

      const result = await fetchOperationalHealth();

      expect(result).toBeNull();
    });
  });

  describe("fetchActiveSessions", () => {
    it("should fetch and unwrap paginated sessions", async () => {
      const sessions = [{ ticketNumber: "T001", plate: "ABC123", vehicleType: "CAR", entryAt: "2025-06-01T10:00:00Z", status: "ACTIVE", totalAmount: null }];
      vi.mocked(apiFetch).mockResolvedValue({ data: sessions } as never);

      const result = await fetchActiveSessions();

      expect(result).toEqual(sessions);
    });

    it("should return array directly when payload is array", async () => {
      const sessions = [{ ticketNumber: "T001", plate: "ABC123", vehicleType: "CAR", entryAt: "2025-06-01T10:00:00Z", status: "ACTIVE", totalAmount: null }];
      vi.mocked(apiFetch).mockResolvedValue(sessions as never);

      const result = await fetchActiveSessions();

      expect(result).toEqual(sessions);
    });

    it("should throw on error", async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error("fail"));

      await expect(fetchActiveSessions()).rejects.toThrow("fail");
    });
  });

  describe("postOperationalAction", () => {
    it("should POST retry-sync action", async () => {
      vi.mocked(apiFetch).mockResolvedValue({ message: "Sync iniciado" } as never);

      const result = await postOperationalAction("retry-sync");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/health/operational/retry-sync"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toBe("Sync iniciado");
    });

    it("should POST test-printer action", async () => {
      vi.mocked(apiFetch).mockResolvedValue({ message: "Impresión de prueba enviada" } as never);

      const result = await postOperationalAction("test-printer");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/health/operational/test-printer"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toBe("Impresión de prueba enviada");
    });

    it("should return default message when payload has no message", async () => {
      vi.mocked(apiFetch).mockResolvedValue({} as never);

      const result = await postOperationalAction("retry-sync");

      expect(result).toBe("Acción ejecutada");
    });
  });
});
