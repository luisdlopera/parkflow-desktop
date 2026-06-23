import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/auth/services/auth-domain.service", () => ({
  authHeaders: () => Promise.resolve({ Authorization: "Bearer test-token" }),
}));

vi.mock("@/lib/api/config", () => ({
  apiBase: () => "http://localhost:6011/api/v1",
}));

vi.mock("@/lib/api/fetch-with-credentials", () => ({
  fetchWithCredentials: vi.fn(),
}));

function okResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 200, statusText: "OK" });
}

function errorResponse(): Response {
  return new Response(JSON.stringify({ error: "fail" }), { status: 400, statusText: "Bad Request" });
}

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
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse([MOCK_PRIORITY_CASE]));

      const { fetchPriorityCases } = await import("../licensing-support-api");
      const result = await fetchPriorityCases();

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/licensing/support/cases/priority"),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it("should return empty array on error", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(errorResponse());

      const { fetchPriorityCases } = await import("../licensing-support-api");
      const result = await fetchPriorityCases();

      expect(result).toEqual([]);
    });
  });

  describe("fetchUnresolvedBlocks", () => {
    it("should fetch unresolved blocks", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse([MOCK_BLOCK_EVENT]));

      const { fetchUnresolvedBlocks } = await import("../licensing-support-api");
      const result = await fetchUnresolvedBlocks();

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/licensing/support/blocks/unresolved"),
        expect.any(Object),
      );
      expect(result).toHaveLength(1);
    });

    it("should fill unknown company name", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(
        okResponse([{ ...MOCK_BLOCK_EVENT, companyName: undefined }]),
      );

      const { fetchUnresolvedBlocks } = await import("../licensing-support-api");
      const result = await fetchUnresolvedBlocks();

      expect(result[0].companyName).toBe("Empresa desconocida");
    });

    it("should return empty array on error", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(errorResponse());

      const { fetchUnresolvedBlocks } = await import("../licensing-support-api");
      const result = await fetchUnresolvedBlocks();

      expect(result).toEqual([]);
    });
  });

  describe("fetchBlockStatistics", () => {
    it("should fetch statistics with default days", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse(MOCK_STATISTICS));

      const { fetchBlockStatistics } = await import("../licensing-support-api");
      const result = await fetchBlockStatistics();

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("days=7"),
        expect.any(Object),
      );
      expect(result?.totalBlocks).toBe(15);
    });

    it("should pass custom days param", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse(MOCK_STATISTICS));

      const { fetchBlockStatistics } = await import("../licensing-support-api");
      await fetchBlockStatistics(30);

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("days=30"),
        expect.any(Object),
      );
    });

    it("should return null on error", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(errorResponse());

      const { fetchBlockStatistics } = await import("../licensing-support-api");
      const result = await fetchBlockStatistics();

      expect(result).toBeNull();
    });
  });

  describe("resolveBlock", () => {
    it("should POST resolve with notes and corrective action", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse(undefined));

      const { resolveBlock } = await import("../licensing-support-api");
      await resolveBlock("block-1", "Pago verificado");

      expect(fetchWithCredentials).toHaveBeenCalledWith(
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
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse(undefined));

      const { markBlockFalsePositive } = await import("../licensing-support-api");
      await markBlockFalsePositive("block-1", "Falso positivo - cliente no manipuló fecha");

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/licensing/support/blocks/block-1/false-positive"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ notes: "Falso positivo - cliente no manipuló fecha" }),
        }),
      );
    });
  });
});
