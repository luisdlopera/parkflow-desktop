import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchRateById,
  fetchRates,
  saveRate,
  patchRateStatus,
  deleteRate,
} from "../rates-api";

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

vi.mock("@/lib/validation/contracts", () => ({
  settingsRateUpsertSchema: { parse: (v: unknown) => v },
  settingsRateStatusSchema: { parse: (v: unknown) => v },
}));

const MOCK_RATE = {
  id: "rate-1",
  name: "Tarifa Estándar",
  vehicleType: "CAR",
  category: "STANDARD",
  rateType: "FIXED",
  amount: 5000,
  graceMinutes: 5,
  toleranceMinutes: 0,
  fractionMinutes: 15,
  roundingMode: "UP",
  active: true,
  site: "Sede Principal",
  siteId: "site-1",
  baseValue: 3000,
  baseMinutes: 60,
  additionalValue: 2000,
  additionalMinutes: 30,
  minSessionValue: null,
  maxSessionValue: null,
  maxDailyValue: null,
  appliesNight: false,
  nightSurchargePercent: 0,
  appliesHoliday: false,
  holidaySurchargePercent: 0,
  appliesDaysBitmap: null,
  windowStart: null,
  windowEnd: null,
  scheduledActiveFrom: null,
  scheduledActiveTo: null,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
} as const;

describe("rates-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchRateById", () => {
    it("should fetch a rate by id", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_RATE);

      const result = await fetchRateById("rate-1");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/settings/rates/rate-1"),
        expect.objectContaining({ cache: "no-store" }),
      );
      expect(result).toEqual(MOCK_RATE);
    });
  });

  describe("fetchRates", () => {
    it("should fetch rates with defaults", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ content: [MOCK_RATE], totalElements: 1, totalPages: 1, page: 0, size: 20 });

      const result = await fetchRates({});

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/settings/rates?page=0&size=20"),
        expect.any(Object),
      );
      expect(result.content).toHaveLength(1);
    });

    it("should pass filter params", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 10 });

      await fetchRates({ site: "site-1", q: "estandar", active: true, page: 1, size: 10 });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("site=site-1"),
        expect.any(Object),
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("q=estandar"),
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
      vi.mocked(apiFetch).mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });

      await fetchRates({ active: null });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.not.stringContaining("active"),
        expect.any(Object),
      );
    });
  });

  describe("saveRate", () => {
    it("should POST when no id", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_RATE);

      const result = await saveRate({ name: "Nueva Tarifa" });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/settings/rates"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toEqual(MOCK_RATE);
    });

    it("should PATCH when id provided", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ ...MOCK_RATE, name: "Actualizada" });

      const result = await saveRate({ name: "Actualizada" }, "rate-1", "updated name");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/settings/rates/rate-1"),
        expect.objectContaining({ method: "PATCH" }),
      );
      expect(result.name).toBe("Actualizada");
    });
  });

  describe("patchRateStatus", () => {
    it("should PATCH status", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ ...MOCK_RATE, active: false });

      const result = await patchRateStatus("rate-1", false, "disabled");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/settings/rates/rate-1/status"),
        expect.objectContaining({ method: "PATCH" }),
      );
      expect(result.active).toBe(false);
    });

    it("should send validated body", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_RATE);
      const { validatePayloadOrThrow } = await import("@/lib/validation/request-guard");
      const spy = vi.fn(validatePayloadOrThrow);

      await patchRateStatus("rate-1", true);

      expect(apiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ active: true }),
        }),
      );
    });
  });

  describe("deleteRate", () => {
    it("should DELETE a rate", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(undefined);

      await deleteRate("rate-1", "cleanup");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/settings/rates/rate-1"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("should succeed without audit reason", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(undefined);

      await deleteRate("rate-1");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });
});
