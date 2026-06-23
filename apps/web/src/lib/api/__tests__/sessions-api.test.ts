import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchActiveSessions,
  fetchParkingSummary,
  fetchParkingSpaces,
} from "../sessions-api";

vi.mock("@/lib/api", () => ({
  buildApiHeaders: () => Promise.resolve({ "Content-Type": "application/json" }),
}));

vi.mock("@/lib/api/config", () => ({
  opsBase: () => "http://localhost:6011/api/v1/operations",
  apiBase: () => "http://localhost:6011/api/v1",
}));

vi.mock("@/lib/api/fetch-with-credentials", () => ({
  fetchWithCredentials: vi.fn(),
}));

function okResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 200, statusText: "OK" });
}

function errorResponse(body?: Record<string, string>): Response {
  const payload = body ?? {};
  return new Response(JSON.stringify(payload), { status: 400, statusText: "Bad Request" });
}

function errorResponseNonJson(): Response {
  return new Response("not found", { status: 404, statusText: "Not Found" });
}

describe("sessions-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchActiveSessions", () => {
    it("should fetch active sessions without params", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      const dto = [{ ticketNumber: "T001", plate: "ABC123", vehicleType: "CAR", duration: "01:30", rateName: "Estándar" }];
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse(dto));

      const result = await fetchActiveSessions();

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/operations/sessions/active-list"),
        expect.any(Object),
      );
      expect(result).toEqual(dto);
    });

    it("should pass query params", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }));

      await fetchActiveSessions({ page: 2, limit: 10, search: "ABC", sortBy: "plate", sortDir: "asc" });

      const url = vi.mocked(fetchWithCredentials).mock.calls[0][0] as string;
      expect(url).toContain("page=2");
      expect(url).toContain("limit=10");
      expect(url).toContain("search=ABC");
      expect(url).toContain("sortBy=plate");
      expect(url).toContain("sortDir=asc");
    });

    it("should throw on error with userMessage", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(errorResponse({ userMessage: "Error personalizado" }));

      await expect(fetchActiveSessions()).rejects.toThrow("Error personalizado");
    });

    it("should throw on error without userMessage", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(errorResponseNonJson());

      await expect(fetchActiveSessions()).rejects.toThrow("No se pudo cargar el listado de vehículos activos");
    });
  });

  describe("fetchParkingSummary", () => {
    it("should fetch summary", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      const summary = { availableSpaces: 20, activeSpaces: 80 };
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse(summary));

      const result = await fetchParkingSummary();

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/parking-spaces/summary"),
        expect.any(Object),
      );
      expect(result.availableSpaces).toBe(20);
    });

    it("should throw on error", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(errorResponseNonJson());

      await expect(fetchParkingSummary()).rejects.toThrow("No se pudo cargar el resumen de celdas");
    });
  });

  describe("fetchParkingSpaces", () => {
    it("should fetch parking spaces", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      const spaces = [{ id: "s1", code: "A1", type: "CAR", status: "ACTIVE", occupied: false }];
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse(spaces));

      const result = await fetchParkingSpaces();

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/parking-spaces"),
        expect.any(Object),
      );
      expect(result).toEqual(spaces);
    });

    it("should throw on error", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(errorResponseNonJson());

      await expect(fetchParkingSpaces()).rejects.toThrow("No se pudieron cargar las celdas de parqueo");
    });
  });
});
