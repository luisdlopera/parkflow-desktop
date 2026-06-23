import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchFeatureConfiguration,
  updateFeatureConfiguration,
} from "../features-api";

vi.mock("@/lib/api/_shared", () => ({
  cfgBase: () => "http://localhost:6011/api/v1/configuration",
  apiV1Base: () => "http://localhost:6011/api/v1",
  apiFetch: vi.fn(),
  buildApiHeaders: () => Promise.resolve({ "Content-Type": "application/json" }),
  hdr: () => ({}),
}));

const MOCK_FEATURES = {
  agreements: true,
  prepaid: false,
  memberships: true,
  electronicBilling: false,
  lockerControl: true,
  motorcycleParking: true,
  bicycleParking: false,
  multiplePaymentMethods: true,
  plateValidation: true,
  specialRates: false,
  frequentCustomers: false,
  helmetControl: true,
  accessoryControl: false,
  reservations: false,
  operation24Hours: true,
};

describe("features-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchFeatureConfiguration", () => {
    it("should fetch feature configuration", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_FEATURES);

      const result = await fetchFeatureConfiguration();

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/features"),
        expect.objectContaining({ cache: "no-store" }),
      );
      expect(result).toEqual(MOCK_FEATURES);
    });

    it("should include silent toast header", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_FEATURES);

      await fetchFeatureConfiguration();

      expect(apiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ "X-Parkflow-Auth-Toast-Silent": "1" }),
        }),
      );
    });
  });

  describe("updateFeatureConfiguration", () => {
    it("should PATCH feature configuration", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_FEATURES);

      const result = await updateFeatureConfiguration({ agreements: true });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/features"),
        expect.objectContaining({ method: "PATCH" }),
      );
      expect(result).toEqual(MOCK_FEATURES);
    });

    it("should send partial update body", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_FEATURES);

      await updateFeatureConfiguration({ helmetControl: false, motorcycleParking: false });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ helmetControl: false, motorcycleParking: false }),
        }),
      );
    });
  });
});
