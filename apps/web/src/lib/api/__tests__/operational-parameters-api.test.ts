import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchConfigurationOperationalParameters,
  putConfigurationOperationalParameters,
} from "../operational-parameters-api";

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
  operationalParameterSchema: { parse: (v: unknown) => v },
}));

const MOCK_OP_PARAMS = {
  siteId: "site-1",
  siteCode: "SEDE001",
  openTime: "06:00",
  closeTime: "22:00",
  toleranceAfterExit: 15,
  toleranceForLostTicket: 30,
  maxPrepaidSamePlate: 3,
  exitMode: "MANUAL",
  validationOnEntry: true,
  validationOnExit: true,
  isOpen24Hours: false,
  enabledFeatures: { prepaid: true, lockers: false },
};

describe("operational-parameters-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchConfigurationOperationalParameters", () => {
    it("should fetch operational parameters by siteId", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_OP_PARAMS);

      const result = await fetchConfigurationOperationalParameters("site-1");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/operational-parameters?siteId=site-1"),
        expect.objectContaining({ cache: "no-store" }),
      );
      expect(result.openTime).toBe("06:00");
    });
  });

  describe("putConfigurationOperationalParameters", () => {
    it("should PUT operational parameters", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      const updated = { ...MOCK_OP_PARAMS, openTime: "07:00" };
      vi.mocked(apiFetch).mockResolvedValue(updated);

      const result = await putConfigurationOperationalParameters(
        "site-1",
        { openTime: "07:00" },
        "updated hours",
      );

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/operational-parameters?siteId=site-1"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ openTime: "07:00" }),
        }),
      );
      expect(result.openTime).toBe("07:00");
    });

    it("should validate payload before PUT", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_OP_PARAMS);

      await putConfigurationOperationalParameters("site-1", { openTime: "08:00" });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "PUT" }),
      );
    });
  });
});
