import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchConfigurationCashRegisters,
  createConfigurationCashRegister,
  updateConfigurationCashRegister,
  patchConfigurationCashRegisterStatus,
} from "../cash-registers-api";

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
  cashRegisterSchema: { parse: (v: unknown) => v, partial: () => ({ parse: (v: unknown) => v }) },
}));

const MOCK_CR = {
  id: "cr-1",
  site: "Sede Principal",
  siteId: "site-1",
  code: "CAJA001",
  name: "Caja Principal",
  terminal: "TERM-01",
  label: "Caja 1",
  printerId: "printer-1",
  responsibleUserId: "user-1",
  active: true,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("cash-registers-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchConfigurationCashRegisters", () => {
    it("should fetch cash registers with defaults", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ content: [MOCK_CR], totalElements: 1, totalPages: 1, page: 0, size: 20 });

      const result = await fetchConfigurationCashRegisters({});

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/cash-registers"),
        expect.any(Object),
      );
      expect(result.content).toHaveLength(1);
    });

    it("should pass filter params", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });

      await fetchConfigurationCashRegisters({ siteId: "site-1", q: "principal", active: true, page: 0, size: 50 });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("siteId=site-1"),
        expect.any(Object),
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("q=principal"),
        expect.any(Object),
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("active=true"),
        expect.any(Object),
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("page=0&size=50"),
        expect.any(Object),
      );
    });
  });

  describe("createConfigurationCashRegister", () => {
    it("should POST a cash register", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_CR);

      const result = await createConfigurationCashRegister({ code: "CAJA002", site: "Sede 2", terminal: "TERM-02" }, "onboarding");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/cash-registers"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toEqual(MOCK_CR);
    });
  });

  describe("updateConfigurationCashRegister", () => {
    it("should PUT updated cash register", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      const updated = { ...MOCK_CR, name: "Caja Actualizada" };
      vi.mocked(apiFetch).mockResolvedValue(updated);

      const result = await updateConfigurationCashRegister("cr-1", { name: "Caja Actualizada" }, "rename");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/cash-registers/cr-1"),
        expect.objectContaining({ method: "PUT" }),
      );
      expect(result.name).toBe("Caja Actualizada");
    });
  });

  describe("patchConfigurationCashRegisterStatus", () => {
    it("should PATCH status as query param", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ ...MOCK_CR, active: false });

      const result = await patchConfigurationCashRegisterStatus("cr-1", false, "disabled");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/cash-registers/cr-1/status?active=false"),
        expect.objectContaining({ method: "PATCH" }),
      );
      expect(result.active).toBe(false);
    });
  });
});
