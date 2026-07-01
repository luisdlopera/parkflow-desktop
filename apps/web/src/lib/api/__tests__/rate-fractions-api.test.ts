import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchConfigurationRateFractions,
  createConfigurationRateFraction,
  updateConfigurationRateFraction,
  deleteConfigurationRateFraction,
} from "../rate-fractions-api";

vi.mock("@/lib/api/_shared", () => ({
  cfgBase: () => "http://localhost:6011/api/v1/configuration",
  apiV1Base: () => "http://localhost:6011/api/v1",
  apiFetch: vi.fn(),
  buildApiHeaders: () => Promise.resolve({ "Content-Type": "application/json" }),
  hdr: (r?: string) => (r?.trim() ? { auditReason: r.trim() } : undefined),
}));

vi.mock("@/lib/validation/request-guard", () => ({
  validatePayloadOrThrow: (_schema: unknown, payload: unknown) => payload,
}));

vi.mock("@/lib/schemas/config.schemas", () => ({
  rateFractionSchema: { parse: (v: unknown) => v },
}));

const MOCK_FRACTION = {
  id: "rf-1",
  rateId: "rate-1",
  fromMinutes: 0,
  toMinutes: 60,
  amount: 5000,
  label: "Primera hora",
  sortOrder: 0,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("rate-fractions-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchConfigurationRateFractions", () => {
    it("should fetch rate fractions by rateId", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue([MOCK_FRACTION] as never);

      const result = await fetchConfigurationRateFractions("rate-1");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/rate-fractions?rateId=rate-1"),
        expect.objectContaining({ cache: "no-store" }),
      );
      expect(result).toEqual({
        content: [MOCK_FRACTION],
        totalElements: 1,
        totalPages: 1,
        page: 0,
        size: 1,
      });
    });
  });

  describe("createConfigurationRateFraction", () => {
    it("should POST a new fraction", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_FRACTION);

      const result = await createConfigurationRateFraction(
        "rate-1",
        { fromMinutes: 60, toMinutes: 120, amount: 3000 },
        "initial setup",
      );

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/rate-fractions?rateId=rate-1"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ fromMinutes: 60, toMinutes: 120, amount: 3000 }),
        }),
      );
      expect(result.id).toBe("rf-1");
    });
  });

  describe("updateConfigurationRateFraction", () => {
    it("should PUT updated fraction", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      const updated = { ...MOCK_FRACTION, amount: 4000 };
      vi.mocked(apiFetch).mockResolvedValue(updated);

      const result = await updateConfigurationRateFraction(
        "rf-1",
        { amount: 4000 },
        "updated price",
      );

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/rate-fractions/rf-1"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ amount: 4000 }),
        }),
      );
      expect(result.amount).toBe(4000);
    });
  });

  describe("deleteConfigurationRateFraction", () => {
    it("should DELETE a fraction", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(undefined);

      await deleteConfigurationRateFraction("rf-1", "cleanup");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/rate-fractions/rf-1"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });
});
