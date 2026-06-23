import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchConfigurationSites,
  createConfigurationSite,
  updateConfigurationSite,
  patchConfigurationSiteStatus,
  fetchParkingSpacesSummary,
  fetchParkingSpaces,
  putParkingSpacesCapacity,
  patchParkingSpace,
} from "../sites-api";

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

vi.mock("@/lib/schemas/config.schemas", () => ({
  parkingSiteSchema: { parse: (v: unknown) => v, partial: () => ({ parse: (v: unknown) => v }) },
}));

const MOCK_SITE = {
  id: "site-1",
  code: "SEDE001",
  name: "Sede Principal",
  address: "Calle 123",
  city: "Bogotá",
  phone: "3000000000",
  managerName: "Admin",
  timezone: "America/Bogota",
  currency: "COP",
  maxCapacity: 100,
  isActive: true,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

const MOCK_SPACE = {
  id: "space-1",
  code: "A1",
  label: "Espacio 1",
  type: "CAR",
  status: "ACTIVE",
  sortOrder: 1,
  occupied: false,
};

describe("sites-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchConfigurationSites", () => {
    it("should fetch sites with defaults", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ content: [MOCK_SITE], totalElements: 1, totalPages: 1, page: 0, size: 20 });

      const result = await fetchConfigurationSites({});

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/parking-sites"),
        expect.any(Object),
      );
      expect(result.content).toHaveLength(1);
    });

    it("should pass filter params", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });

      await fetchConfigurationSites({ companyId: "c1", q: "principal", active: false, page: 0, size: 50 });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("companyId=c1"),
        expect.any(Object),
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("q=principal"),
        expect.any(Object),
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("active=false"),
        expect.any(Object),
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("page=0&size=50"),
        expect.any(Object),
      );
    });
  });

  describe("createConfigurationSite", () => {
    it("should POST with companyId param", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_SITE);

      const result = await createConfigurationSite({ name: "Nueva Sede", code: "NS001" }, "c-1", "onboarding");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/parking-sites?companyId=c-1"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toEqual(MOCK_SITE);
    });
  });

  describe("updateConfigurationSite", () => {
    it("should PUT updated site", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ ...MOCK_SITE, name: "Actualizada" });

      const result = await updateConfigurationSite("site-1", { name: "Actualizada" }, "rename");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/parking-sites/site-1"),
        expect.objectContaining({ method: "PUT" }),
      );
      expect(result.name).toBe("Actualizada");
    });
  });

  describe("patchConfigurationSiteStatus", () => {
    it("should PATCH status as query param", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ ...MOCK_SITE, isActive: false });

      const result = await patchConfigurationSiteStatus("site-1", false, "disabled");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/parking-sites/site-1/status?active=false"),
        expect.objectContaining({ method: "PATCH" }),
      );
      expect(result.isActive).toBe(false);
    });
  });

  describe("fetchParkingSpacesSummary", () => {
    it("should fetch summary", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      const summary = { totalSpaces: 100, activeSpaces: 80, occupiedSpaces: 60, availableSpaces: 20, maintenanceSpaces: 0, inactiveSpaces: 0, occupancyPercentage: 75 };
      vi.mocked(apiFetch).mockResolvedValue(summary);

      const result = await fetchParkingSpacesSummary();

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/parking-spaces/summary"),
        expect.any(Object),
      );
      expect(result.totalSpaces).toBe(100);
    });
  });

  describe("fetchParkingSpaces", () => {
    it("should fetch spaces without filter", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue([MOCK_SPACE]);

      const result = await fetchParkingSpaces();

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/parking-spaces"),
        expect.any(Object),
      );
      expect(result).toHaveLength(1);
    });

    it("should pass filter param", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue([]);

      await fetchParkingSpaces("CAR");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("filter=CAR"),
        expect.any(Object),
      );
    });
  });

  describe("putParkingSpacesCapacity", () => {
    it("should PUT capacity", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({});

      await putParkingSpacesCapacity(150);

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/parking-spaces/capacity"),
        expect.objectContaining({ method: "PUT", body: JSON.stringify({ capacity: 150 }) }),
      );
    });
  });

  describe("patchParkingSpace", () => {
    it("should PATCH a parking space", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      const updated = { ...MOCK_SPACE, status: "MAINTENANCE" };
      vi.mocked(apiFetch).mockResolvedValue(updated);

      const result = await patchParkingSpace("space-1", { status: "MAINTENANCE" });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/parking-spaces/space-1"),
        expect.objectContaining({ method: "PATCH" }),
      );
      expect(result.status).toBe("MAINTENANCE");
    });
  });
});
