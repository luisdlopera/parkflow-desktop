import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchMonthlyContracts,
  saveMonthlyContract,
  patchMonthlyContractStatus,
} from "../monthly-contracts-api";
import type { MonthlyContractRow } from "../monthly-contracts-api";

vi.mock("@/lib/api/_shared", () => ({
  cfgBase: () => "http://localhost:6011/api/v1/configuration",
  apiV1Base: () => "http://localhost:6011/api/v1",
  apiFetch: vi.fn(),
  buildApiHeaders: () => Promise.resolve({ "Content-Type": "application/json" }),
  hdr: () => ({}),
}));

vi.mock("@/lib/validation/request-guard", () => ({
  validatePayloadOrThrow: (_schema: unknown, payload: unknown) => payload,
}));

const MOCK_CONTRACT: MonthlyContractRow = {
  id: "mc-1",
  rateId: "rate-1",
  rateName: "Mensualidad Estándar",
  plate: "ABC123",
  vehicleType: "CAR",
  holderName: "Juan Pérez",
  holderDocument: "12345678",
  holderPhone: "3001234567",
  holderEmail: "juan@example.com",
  site: "Sede Principal",
  siteId: "site-1",
  startDate: "2025-01-01T00:00:00Z",
  endDate: "2025-12-31T00:00:00Z",
  amount: 120000,
  active: true,
  notes: null,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("monthly-contracts-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchMonthlyContracts", () => {
    it("should fetch contracts with defaults", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({
        content: [MOCK_CONTRACT],
        totalElements: 1,
        totalPages: 1,
        page: 0,
        size: 20,
      });

      const result = await fetchMonthlyContracts({});

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/monthly-contracts"),
        expect.any(Object),
      );
      expect(result.content).toHaveLength(1);
    });

    it("should pass filter params", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({
        content: [],
        totalElements: 0,
        totalPages: 0,
        page: 0,
        size: 20,
      });

      await fetchMonthlyContracts({
        site: "site-1",
        plate: "ABC123",
        active: true,
        page: 1,
        size: 10,
      });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("site=site-1"),
        expect.any(Object),
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("plate=ABC123"),
        expect.any(Object),
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("active=true"),
        expect.any(Object),
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("page=1&size=10"),
        expect.any(Object),
      );
    });

    it("should omit active when null", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({
        content: [],
        totalElements: 0,
        totalPages: 0,
        page: 0,
        size: 20,
      });

      await fetchMonthlyContracts({ active: null });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.not.stringContaining("active="),
        expect.any(Object),
      );
    });
  });

  describe("saveMonthlyContract", () => {
    it("should POST when no id", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_CONTRACT);

      const result = await saveMonthlyContract({
        plate: "ABC123",
        holderName: "Juan Pérez",
        amount: 120000,
      });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/monthly-contracts"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toEqual(MOCK_CONTRACT);
    });

    it("should PUT when id provided", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      const updated = { ...MOCK_CONTRACT, amount: 130000 };
      vi.mocked(apiFetch).mockResolvedValue(updated);

      const result = await saveMonthlyContract(
        { amount: 130000 },
        "mc-1",
        "updated amount",
      );

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/monthly-contracts/mc-1"),
        expect.objectContaining({ method: "PUT" }),
      );
      expect(result.amount).toBe(130000);
    });
  });

  describe("patchMonthlyContractStatus", () => {
    it("should PATCH status as query param", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ ...MOCK_CONTRACT, active: false });

      const result = await patchMonthlyContractStatus("mc-1", false, "expired");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/monthly-contracts/mc-1/status?active=false"),
        expect.objectContaining({ method: "PATCH" }),
      );
      expect(result.active).toBe(false);
    });
  });
});
