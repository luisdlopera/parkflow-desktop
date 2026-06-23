import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/fetch-with-credentials", () => ({
  fetchWithCredentials: vi.fn(),
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
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
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
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as any);

      const { precalculateBulkExit } = await import("@/lib/api/bulk-exit-api");
      const result = await precalculateBulkExit(MOCK_REQUEST);

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/bulk-exits/calculate"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.finalTotal).toBe(14000);
      expect(result.items).toHaveLength(2);
    });

    it("throws user-friendly error on non-ok response", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Calculation failed" }),
      } as any);

      const { precalculateBulkExit } = await import("@/lib/api/bulk-exit-api");
      await expect(precalculateBulkExit(MOCK_REQUEST)).rejects.toThrow("Calculation failed");
    });

    it("throws default error when no error message in response", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      } as any);

      const { precalculateBulkExit } = await import("@/lib/api/bulk-exit-api");
      await expect(precalculateBulkExit(MOCK_REQUEST)).rejects.toThrow(
        "Error al pre-liquidar las salidas masivas",
      );
    });
  });

  describe("processBulkExit", () => {
    it("POSTs to /bulk-exits with request body", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          totalCharged: 14000,
          successfulCount: 2,
          failedCount: 0,
          successfulReceipts: [{ ticketNumber: "T1" }],
          errors: [],
        }),
      } as any);

      const { processBulkExit } = await import("@/lib/api/bulk-exit-api");
      const result = await processBulkExit(MOCK_REQUEST);

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/bulk-exits"),
        expect.objectContaining({ method: "POST", body: JSON.stringify(MOCK_REQUEST) }),
      );
      expect(result.successfulCount).toBe(2);
    });

    it("throws with userMessage on error", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({
          userMessage: "No se encontraron vehículos para los localizadores proporcionados",
        }),
      } as any);

      const { processBulkExit } = await import("@/lib/api/bulk-exit-api");
      await expect(processBulkExit(MOCK_REQUEST)).rejects.toThrow(
        "No se encontraron vehículos para los localizadores proporcionados",
      );
    });

    it("throws default error when no userMessage", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: false,
        json: () => Promise.reject(new Error("parse error")),
      } as any);

      const { processBulkExit } = await import("@/lib/api/bulk-exit-api");
      await expect(processBulkExit(MOCK_REQUEST)).rejects.toThrow(
        "Error al procesar las salidas masivas",
      );
    });
  });
});
