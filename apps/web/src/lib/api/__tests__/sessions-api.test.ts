import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchActiveSessions,
  fetchParkingSummary,
  fetchParkingSpaces,
} from "../sessions-api";
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

describe("sessions-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchActiveSessions", () => {
    it("should fetch active sessions without params", async () => {
      const dto = [{ ticketNumber: "T001", plate: "ABC123", vehicleType: "CAR", duration: "01:30", rateName: "Estándar" }];
      vi.mocked(apiFetch).mockResolvedValue(dto as never);

      const result = await fetchActiveSessions();

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/operations/sessions/active-list"),
        expect.any(Object),
      );
      expect(result).toEqual({
        data: dto,
        meta: {
          total: 1,
          page: 1,
          limit: 1,
          totalPages: 1,
        },
      });
    });

    it("should pass query params", async () => {
      vi.mocked(apiFetch).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } } as never);

      const result = await fetchActiveSessions({ page: 2, limit: 10, search: "ABC", sortBy: "plate", sortDir: "asc" });

      const url = vi.mocked(apiFetch).mock.calls[0][0] as string;
      expect(url).toContain("page=2");
      expect(url).toContain("limit=10");
      expect(url).toContain("search=ABC");
      expect(url).toContain("sortBy=plate");
      expect(url).toContain("sortDir=asc");
      expect(result).toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
    });

    it("should throw on error with userMessage", async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error("Error personalizado"));

      await expect(fetchActiveSessions()).rejects.toThrow("Error personalizado");
    });

    it("should throw on error without userMessage", async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error("El recurso solicitado no existe o fue eliminado."));

      await expect(fetchActiveSessions()).rejects.toThrow("El recurso solicitado no existe o fue eliminado.");
    });
  });

  describe("fetchParkingSummary", () => {
    it("should fetch summary", async () => {
      const summary = { availableSpaces: 20, activeSpaces: 80 };
      vi.mocked(apiFetch).mockResolvedValue(summary as never);

      const result = await fetchParkingSummary();

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/parking-spaces/summary"),
        expect.any(Object),
      );
      expect(result.availableSpaces).toBe(20);
    });

    it("should throw on error", async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error("El recurso solicitado no existe o fue eliminado."));

      await expect(fetchParkingSummary()).rejects.toThrow("El recurso solicitado no existe o fue eliminado.");
    });
  });

  describe("fetchParkingSpaces", () => {
    it("should fetch parking spaces", async () => {
      const spaces = [{ id: "s1", code: "A1", type: "CAR", status: "ACTIVE", occupied: false }];
      vi.mocked(apiFetch).mockResolvedValue(spaces as never);

      const result = await fetchParkingSpaces();

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/parking-spaces"),
        expect.any(Object),
      );
      expect(result).toEqual(spaces);
    });

    it("should throw on error", async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error("El recurso solicitado no existe o fue eliminado."));

      await expect(fetchParkingSpaces()).rejects.toThrow("El recurso solicitado no existe o fue eliminado.");
    });
  });
});
