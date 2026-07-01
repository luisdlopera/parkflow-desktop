import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "../_shared";

vi.mock("../_shared", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/api/config", () => ({
  opsBase: () => "http://localhost:6011/api/v1/operations",
}));

vi.mock("@/lib/api", () => ({
  buildApiHeaders: () => Promise.resolve({ "Content-Type": "application/json" }),
}));

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
      vi.mocked(apiFetch).mockResolvedValue(MOCK_PREVIEW as never);

      const { previewMassExit } = await import("../mass-exit-api");
      const result = await previewMassExit(MOCK_REQUEST);

      expect(apiFetch).toHaveBeenCalledWith(
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
      vi.mocked(apiFetch).mockRejectedValue(new Error("No hay vehículos activos"));

      const { previewMassExit } = await import("../mass-exit-api");
      await expect(previewMassExit(MOCK_REQUEST)).rejects.toThrow(
        "No hay vehículos activos",
      );
    });

    it("should throw default error with status code", async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error("El recurso solicitado no existe o fue eliminado."));

      const { previewMassExit } = await import("../mass-exit-api");
      await expect(previewMassExit(MOCK_REQUEST)).rejects.toThrow("El recurso solicitado no existe o fue eliminado.");
    });
  });

  describe("processMassExit", () => {
    it("should POST to process endpoint", async () => {
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
      vi.mocked(apiFetch).mockResolvedValue(mockProcessResult as never);

      const { processMassExit } = await import("../mass-exit-api");
      const result = await processMassExit(MOCK_REQUEST);

      expect(apiFetch).toHaveBeenCalledWith(
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
      vi.mocked(apiFetch).mockRejectedValue(new Error("Error al procesar salidas"));

      const { processMassExit } = await import("../mass-exit-api");
      await expect(processMassExit(MOCK_REQUEST)).rejects.toThrow(
        "Error al procesar salidas",
      );
    });

    it("should throw with error field on error", async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error("Conflict"));

      const { processMassExit } = await import("../mass-exit-api");
      await expect(processMassExit(MOCK_REQUEST)).rejects.toThrow("Conflict");
    });
  });
});
