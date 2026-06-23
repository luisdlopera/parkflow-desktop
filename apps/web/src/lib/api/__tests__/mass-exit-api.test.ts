import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  buildApiHeaders: () => Promise.resolve({ "Content-Type": "application/json" }),
}));

vi.mock("@/lib/api/config", () => ({
  opsBase: () => "http://localhost:6011/api/v1/operations",
}));

vi.mock("@/lib/api/fetch-with-credentials", () => ({
  fetchWithCredentials: vi.fn(),
}));

function okResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 200, statusText: "OK" });
}

function errorResponse(body?: Record<string, string>): Response {
  return new Response(JSON.stringify(body ?? {}), { status: 400, statusText: "Bad Request" });
}

const MOCK_PREVIEW = {
  totalCandidates: 2,
  estimatedTotal: 15000,
  items: [
    {
      ticketNumber: "T001",
      plate: "ABC123",
      vehicleType: "CAR",
      site: "Sede Principal",
      entryAt: "2025-06-01T10:00:00Z",
      status: "SUCCESS" as const,
      amountCharged: 10000,
      errorMessage: null,
    },
    {
      ticketNumber: "T002",
      plate: "DEF456",
      vehicleType: "MOTO",
      site: "Sede Principal",
      entryAt: "2025-06-01T11:00:00Z",
      status: "SUCCESS" as const,
      amountCharged: 5000,
      errorMessage: null,
    },
  ],
  warnings: [],
};

const MOCK_REQUEST = {
  chargeMode: "NORMAL" as const,
  reason: "Cierre del día",
  operatorUserId: "user-1",
  paymentMethod: "CASH",
};

describe("mass-exit-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("previewMassExit", () => {
    it("should POST to calculate endpoint", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse(MOCK_PREVIEW));

      const { previewMassExit } = await import("../mass-exit-api");
      const result = await previewMassExit(MOCK_REQUEST);

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/mass-exit/calculate"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(MOCK_REQUEST),
        }),
      );
      expect(result.totalCandidates).toBe(2);
      expect(result.items).toHaveLength(2);
    });

    it("should throw with userMessage on error", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(
        errorResponse({ userMessage: "No hay vehículos activos" }),
      );

      const { previewMassExit } = await import("../mass-exit-api");
      await expect(previewMassExit(MOCK_REQUEST)).rejects.toThrow(
        "No hay vehículos activos",
      );
    });

    it("should throw default error with status code", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(
        new Response("not found", { status: 404, statusText: "Not Found" }),
      );

      const { previewMassExit } = await import("../mass-exit-api");
      await expect(previewMassExit(MOCK_REQUEST)).rejects.toThrow("Error 404");
    });
  });

  describe("processMassExit", () => {
    it("should POST to process endpoint", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      const mockProcessResult = {
        totalCandidates: 2,
        successCount: 2,
        failCount: 0,
        skippedCount: 0,
        totalCharged: 15000,
        totalExempted: 0,
        durationMs: 500,
        batchId: "batch-1",
        items: MOCK_PREVIEW.items,
      };
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse(mockProcessResult));

      const { processMassExit } = await import("../mass-exit-api");
      const result = await processMassExit(MOCK_REQUEST);

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/mass-exit"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(MOCK_REQUEST),
        }),
      );
      expect(result.successCount).toBe(2);
      expect(result.batchId).toBe("batch-1");
    });

    it("should throw with userMessage on error", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(
        errorResponse({ userMessage: "Error al procesar salidas" }),
      );

      const { processMassExit } = await import("../mass-exit-api");
      await expect(processMassExit(MOCK_REQUEST)).rejects.toThrow(
        "Error al procesar salidas",
      );
    });

    it("should throw with error field on error", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(
        errorResponse({ error: "Conflict" }),
      );

      const { processMassExit } = await import("../mass-exit-api");
      await expect(processMassExit(MOCK_REQUEST)).rejects.toThrow("Conflict");
    });
  });
});
