import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "../_shared";

vi.mock("@/lib/services/auth-domain.service", () => ({
  authHeaders: () => Promise.resolve({ "Content-Type": "application/json", "X-API-Key": "test-api-key" }),
}));

vi.mock("@/lib/api/config", () => ({
  apiBase: () => "http://localhost:6011/api/v1",
}));

vi.mock("../_shared", () => ({
  apiFetch: vi.fn(),
}));

const MOCK_PRIORITY_CASE = {
  companyId: "company-1",
  companyName: "Parqueadero ABC",
  severity: "HIGH" as const,
  issueType: "PAYMENT_AFTER_BLOCK",
  description: "Cliente pagó pero sigue bloqueado",
  affectedDevices: 3,
  lastIncidentAt: "2025-06-01T10:00:00Z",
  recommendedAction: "Desbloquear empresa y verificar pago",
};

const MOCK_BLOCK_EVENT = {
  id: "block-1",
  companyId: "company-1",
  companyName: "Parqueadero ABC",
  eventType: "LICENSE_EXPIRED",
  reasonCode: "LICENSE_EXPIRED",
  reasonDescription: "Licencia vencida desde 2025-05-01",
  createdAt: "2025-06-01T10:00:00Z",
  resolved: false,
  falsePositive: false,
};

const MOCK_STATISTICS = {
  totalBlocks: 15,
  resolvedBlocks: 12,
  falsePositives: 1,
  unresolvedBlocks: 3,
  blocksByReason: { LICENSE_EXPIRED: 8, INVALID_SIGNATURE: 2, TIME_MANIPULATION: 5 },
  blocksByDay: [{ date: "2025-06-01", count: 3 }],
  averageResolutionTimeMinutes: 120,
};

describe("licensing-support-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchPriorityCases", () => {
    it("should fetch priority cases", async () => {
      vi.mocked(apiFetch).mockResolvedValue([MOCK_PRIORITY_CASE] as never);

      const { fetchPriorityCases } = await import("../licensing-support-api");
      const result = await fetchPriorityCases();

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/licensing/support/cases/priority"),
        expect.objectContaining({
          headers: expect.objectContaining({ "Content-Type": "application/json", "X-API-Key": "test-api-key" }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it("should return empty array on error", async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error("fail"));

      const { fetchPriorityCases } = await import("../licensing-support-api");
      const result = await fetchPriorityCases();

      expect(result).toEqual([]);
    });
  });

  describe("fetchUnresolvedBlocks", () => {
    it("should fetch unresolved blocks", async () => {
      vi.mocked(apiFetch).mockResolvedValue([MOCK_BLOCK_EVENT] as never);

      const { fetchUnresolvedBlocks } = await import("../licensing-support-api");
      const result = await fetchUnresolvedBlocks();

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/licensing/support/blocks/unresolved"),
        expect.any(Object),
      );
      expect(result).toHaveLength(1);
    });

    it("should fill unknown company name", async () => {
      vi.mocked(apiFetch).mockResolvedValue([{ ...MOCK_BLOCK_EVENT, companyName: undefined }] as never);

      const { fetchUnresolvedBlocks } = await import("../licensing-support-api");
      const result = await fetchUnresolvedBlocks();

      expect(result[0].companyName).toBe("Empresa desconocida");
    });

    it("should return empty array on error", async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error("fail"));

      const { fetchUnresolvedBlocks } = await import("../licensing-support-api");
      const result = await fetchUnresolvedBlocks();

      expect(result).toEqual([]);
    });
  });

  describe("fetchBlockStatistics", () => {
    it("should fetch statistics with default days", async () => {
      vi.mocked(apiFetch).mockResolvedValue(MOCK_STATISTICS as never);

      const { fetchBlockStatistics } = await import("../licensing-support-api");
      const result = await fetchBlockStatistics();

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("days=7"),
        expect.any(Object),
      );
      expect(result?.totalBlocks).toBe(15);
    });

    it("should pass custom days param", async () => {
      vi.mocked(apiFetch).mockResolvedValue(MOCK_STATISTICS as never);

      const { fetchBlockStatistics } = await import("../licensing-support-api");
      await fetchBlockStatistics(30);

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("days=30"),
        expect.any(Object),
      );
    });

    it("should return null on error", async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error("fail"));

      const { fetchBlockStatistics } = await import("../licensing-support-api");
      const result = await fetchBlockStatistics();

      expect(result).toBeNull();
    });
  });

  describe("resolveBlock", () => {
    it("should POST resolve with notes and corrective action", async () => {
      vi.mocked(apiFetch).mockResolvedValue(undefined as never);

      const { resolveBlock } = await import("../licensing-support-api");
      await resolveBlock("block-1", "Pago verificado");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/licensing/support/blocks/block-1/resolve"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            notes: "Pago verificado",
            correctiveAction: "MANUAL_RESOLUTION",
          }),
        }),
      );
    });
  });

  describe("markBlockFalsePositive", () => {
    it("should POST false positive with notes", async () => {
      vi.mocked(apiFetch).mockResolvedValue(undefined as never);

      const { markBlockFalsePositive } = await import("../licensing-support-api");
      await markBlockFalsePositive("block-1", "Falso positivo - cliente no manipuló fecha");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/licensing/support/blocks/block-1/false-positive"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ notes: "Falso positivo - cliente no manipuló fecha" }),
        }),
      );
    });
  });
});
