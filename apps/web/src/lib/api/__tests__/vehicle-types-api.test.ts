import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchMasterVehicleTypes,
  saveMasterVehicleType,
  patchVehicleTypeStatus,
  deleteVehicleType,
} from "../vehicle-types-api";

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
  vehicleTypeSchema: { parse: (v: unknown) => v },
}));

const MOCK_VT = {
  id: "vt-1",
  code: "CAR",
  name: "Automóvil",
  icon: "car",
  color: "#2563EB",
  isActive: true,
  requiresPlate: true,
  hasOwnRate: true,
  quickAccess: true,
  requiresPhoto: false,
  displayOrder: 1,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("vehicle-types-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchMasterVehicleTypes", () => {
    it("should fetch all vehicle types", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue([MOCK_VT]);

      const result = await fetchMasterVehicleTypes();

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/vehicle-types"),
        expect.objectContaining({ cache: "no-store" }),
      );
      expect(result).toHaveLength(1);
    });

    it("should pass audit reason", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue([]);

      await fetchMasterVehicleTypes("audit-test");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
      );
    });
  });

  describe("saveMasterVehicleType", () => {
    it("should POST when no id", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_VT);

      const result = await saveMasterVehicleType({ code: "MOTO" });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/vehicle-types"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toEqual(MOCK_VT);
    });

    it("should PUT when id provided with full data", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      const updated = { ...MOCK_VT, name: "Moto Actualizada" };
      vi.mocked(apiFetch).mockResolvedValue(updated);

      const result = await saveMasterVehicleType({ code: "MOTO", name: "Moto Actualizada", color: "#FF0000" }, "vt-2", "update color");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/vehicle-types/vt-2"),
        expect.objectContaining({ method: "PUT" }),
      );
      expect(result.name).toBe("Moto Actualizada");
    });

    it("should send only code on POST", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_VT);

      await saveMasterVehicleType({ code: "BIKE", name: "Bicicleta", icon: "bike" });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ body: JSON.stringify({ code: "BIKE" }) }),
      );
    });
  });

  describe("patchVehicleTypeStatus", () => {
    it("should PATCH status", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(undefined);

      await patchVehicleTypeStatus("vt-1", false, "deactivated");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/vehicle-types/vt-1/status?active=false"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  describe("deleteVehicleType", () => {
    it("should DELETE vehicle type", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(undefined);

      await deleteVehicleType("vt-1", "cleanup");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/vehicle-types/vt-1"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });
});
