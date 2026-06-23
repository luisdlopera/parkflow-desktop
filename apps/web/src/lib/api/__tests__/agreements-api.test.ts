import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchAgreements,
  resolveAgreementByCode,
  saveAgreement,
  patchAgreementStatus,
} from "../agreements-api";
import type { AgreementRow } from "../agreements-api";

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

const MOCK_AGREEMENT: AgreementRow = {
  id: "agr-1",
  code: "AGR001",
  companyName: "Parqueadero ABC",
  discountPercent: 10,
  maxHoursPerDay: 8,
  flatAmount: null,
  rateId: "rate-1",
  rateName: "Estándar",
  site: "Sede Principal",
  siteId: "site-1",
  validFrom: "2025-01-01T00:00:00Z",
  validTo: "2025-12-31T00:00:00Z",
  active: true,
  notes: null,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("agreements-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchAgreements", () => {
    it("should fetch agreements with defaults", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({
        content: [MOCK_AGREEMENT],
        totalElements: 1,
        totalPages: 1,
        page: 0,
        size: 20,
      });

      const result = await fetchAgreements({});

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/agreements"),
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

      await fetchAgreements({ site: "site-1", q: "abc", active: true, page: 1, size: 10 });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("site=site-1"),
        expect.any(Object),
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("q=abc"),
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

      await fetchAgreements({ active: null });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.not.stringContaining("active="),
        expect.any(Object),
      );
    });
  });

  describe("resolveAgreementByCode", () => {
    it("should resolve agreement by code", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_AGREEMENT);

      const result = await resolveAgreementByCode("AGR001");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/agreements/resolve?code=AGR001"),
        expect.objectContaining({ cache: "no-store" }),
      );
      expect(result.id).toBe("agr-1");
    });

    it("should encode URI component", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_AGREEMENT);

      await resolveAgreementByCode("AG R/001");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("code=AG%20R%2F001"),
        expect.any(Object),
      );
    });
  });

  describe("saveAgreement", () => {
    it("should POST when no id", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_AGREEMENT);

      const result = await saveAgreement({ code: "AGR002", companyName: "Nuevo" });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/agreements"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toEqual(MOCK_AGREEMENT);
    });

    it("should PUT when id provided", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      const updated = { ...MOCK_AGREEMENT, discountPercent: 15 };
      vi.mocked(apiFetch).mockResolvedValue(updated);

      const result = await saveAgreement(
        { code: "AGR001", discountPercent: 15 },
        "agr-1",
        "updated discount",
      );

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/agreements/agr-1"),
        expect.objectContaining({ method: "PUT" }),
      );
      expect(result.discountPercent).toBe(15);
    });
  });

  describe("patchAgreementStatus", () => {
    it("should PATCH status as query param", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ ...MOCK_AGREEMENT, active: false });

      const result = await patchAgreementStatus("agr-1", false, "disabled");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/agreements/agr-1/status?active=false"),
        expect.objectContaining({ method: "PATCH" }),
      );
      expect(result.active).toBe(false);
    });
  });
});
