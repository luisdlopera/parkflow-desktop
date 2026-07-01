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

const MOCK_REQUEST = {
  locators: ["L1", "L2"],
  operatorUserId: "user-1",
  paymentMethod: "CASH",
};

describe("bulk-exit-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("precalculateBulkExit", () => {
    it("POSTs to /bulk-exits/calculate and returns response", async () => {
      const mockResponse = {
        totalSubtotal: 15000,
        totalSurcharge: 0,
        totalDiscount: 1000,
        finalTotal: 14000,
        totalVehicles: 2,
        items: [
          {
            locator: "L1",
            plate: "ABC123",
            ticketNumber: "T1",
            subtotal: 10000,
            discount: 1000,
            total: 9000,
            errorMessage: null,
          },
          {
            locator: "L2",
            plate: "DEF456",
            ticketNumber: "T2",
            subtotal: 5000,
            discount: 0,
            total: 5000,
            errorMessage: null,
          },
        ],
        errors: [],
      };
      vi.mocked(apiFetch).mockResolvedValue(mockResponse as never);

      const { precalculateBulkExit } = await import("../bulk-exit-api");
      const result = await precalculateBulkExit(MOCK_REQUEST);

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/bulk-exits/calculate"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.finalTotal).toBe(14000);
      expect(result.items).toHaveLength(2);
    });

    it("throws user-friendly error on non-ok response", async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error("Calculation failed"));

      const { precalculateBulkExit } = await import("../bulk-exit-api");
      await expect(precalculateBulkExit(MOCK_REQUEST)).rejects.toThrow("Calculation failed");
    });

    it("throws default error when no error message in response", async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error("Revisa la información ingresada."));

      const { precalculateBulkExit } = await import("../bulk-exit-api");
      await expect(precalculateBulkExit(MOCK_REQUEST)).rejects.toThrow(
        "Revisa la información ingresada.",
      );
    });
  });

  describe("processBulkExit", () => {
    it("POSTs to /bulk-exits with request body", async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        totalCharged: 14000,
        successfulCount: 2,
        failedCount: 0,
        successfulReceipts: [{ ticketNumber: "T1" }],
        errors: [],
      } as never);

      const { processBulkExit } = await import("../bulk-exit-api");
      const result = await processBulkExit(MOCK_REQUEST);

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/bulk-exits"),
        expect.objectContaining({ method: "POST", body: JSON.stringify(MOCK_REQUEST) }),
      );
      expect(result.successfulCount).toBe(2);
    });

    it("throws with userMessage on error", async () => {
      vi.mocked(apiFetch).mockRejectedValue(
        new Error("No se encontraron vehículos para los localizadores proporcionados"),
      );

      const { processBulkExit } = await import("../bulk-exit-api");
      await expect(processBulkExit(MOCK_REQUEST)).rejects.toThrow(
        "No se encontraron vehículos para los localizadores proporcionados",
      );
    });

    it("throws default error when no userMessage", async () => {
      vi.mocked(apiFetch).mockRejectedValue(
        new Error("El recurso solicitado no existe o fue eliminado."),
      );

      const { processBulkExit } = await import("../bulk-exit-api");
      await expect(processBulkExit(MOCK_REQUEST)).rejects.toThrow(
        "El recurso solicitado no existe o fue eliminado.",
      );
    });
  });
});
