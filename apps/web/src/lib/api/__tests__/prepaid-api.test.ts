import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchPrepaidPackages,
  savePrepaidPackage,
  patchPrepaidPackageStatus,
  fetchPrepaidBalance,
  purchasePrepaidBalance,
  deductPrepaidBalance,
} from "../prepaid-api";
import type { PrepaidPackageRow, PrepaidBalanceRow } from "../prepaid-api";

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

const MOCK_PACKAGE: PrepaidPackageRow = {
  id: "pp-1",
  name: "10 Horas",
  hoursIncluded: 10,
  amount: 50000,
  vehicleType: "CAR",
  site: "Sede Principal",
  siteId: "site-1",
  expiresDays: 30,
  active: true,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

const MOCK_BALANCE: PrepaidBalanceRow = {
  id: "pb-1",
  packageId: "pp-1",
  packageName: "10 Horas",
  plate: "ABC123",
  holderName: "Juan Pérez",
  remainingMinutes: 600,
  purchasedAt: "2025-01-01T00:00:00Z",
  expiresAt: "2025-01-31T00:00:00Z",
  active: true,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("prepaid-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchPrepaidPackages", () => {
    it("should fetch packages with defaults", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({
        content: [MOCK_PACKAGE],
        totalElements: 1,
        totalPages: 1,
        page: 0,
        size: 20,
      });

      const result = await fetchPrepaidPackages({});

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/prepaid/packages"),
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

      await fetchPrepaidPackages({ site: "site-1", q: "10 horas", active: true, page: 1, size: 10 });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("site=site-1"),
        expect.any(Object),
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("q=10+horas"),
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
  });

  describe("savePrepaidPackage", () => {
    it("should POST when no id", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_PACKAGE);

      const result = await savePrepaidPackage({ name: "20 Horas", hoursIncluded: 20, amount: 80000 });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/prepaid/packages"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toEqual(MOCK_PACKAGE);
    });

    it("should PUT when id provided", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      const updated = { ...MOCK_PACKAGE, amount: 55000 };
      vi.mocked(apiFetch).mockResolvedValue(updated);

      const result = await savePrepaidPackage({ amount: 55000 }, "pp-1", "updated price");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/prepaid/packages/pp-1"),
        expect.objectContaining({ method: "PUT" }),
      );
      expect(result.amount).toBe(55000);
    });
  });

  describe("patchPrepaidPackageStatus", () => {
    it("should PATCH status as query param", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ ...MOCK_PACKAGE, active: false });

      const result = await patchPrepaidPackageStatus("pp-1", false, "disabled");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/prepaid/packages/pp-1/status?active=false"),
        expect.objectContaining({ method: "PATCH" }),
      );
      expect(result.active).toBe(false);
    });
  });

  describe("fetchPrepaidBalance", () => {
    it("should fetch prepaid balance by plate", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue([MOCK_BALANCE]);

      const result = await fetchPrepaidBalance("ABC123");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/prepaid/balance?plate=ABC123"),
        expect.objectContaining({ cache: "no-store" }),
      );
      expect(result).toHaveLength(1);
    });

    it("should encode plate", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue([]);

      await fetchPrepaidBalance("AB C/123");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("plate=AB%20C%2F123"),
        expect.any(Object),
      );
    });
  });

  describe("purchasePrepaidBalance", () => {
    it("should POST purchase with packageId and plate", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_BALANCE);

      const result = await purchasePrepaidBalance("pp-1", "ABC123", "Juan Pérez");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/prepaid/balance/purchase"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ packageId: "pp-1", plate: "ABC123", holderName: "Juan Pérez" }),
        }),
      );
      expect(result.id).toBe("pb-1");
    });

    it("should work without holderName", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_BALANCE);

      await purchasePrepaidBalance("pp-1", "ABC123");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ packageId: "pp-1", plate: "ABC123", holderName: undefined }),
        }),
      );
    });
  });

  describe("deductPrepaidBalance", () => {
    it("should PATCH deduct minutes from balance", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      const updated = { ...MOCK_BALANCE, remainingMinutes: 500 };
      vi.mocked(apiFetch).mockResolvedValue(updated);

      const result = await deductPrepaidBalance("pb-1", 100, "entry exit");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/prepaid/balance/pb-1/deduct?minutes=100"),
        expect.objectContaining({ method: "PATCH" }),
      );
      expect(result.remainingMinutes).toBe(500);
    });
  });
});
