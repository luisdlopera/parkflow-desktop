import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchConfigurationPrinters,
  createConfigurationPrinter,
  updateConfigurationPrinter,
  patchConfigurationPrinterStatus,
} from "../printers-api";

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
  printerSchema: { parse: (v: unknown) => v, partial: () => ({ parse: (v: unknown) => v }) },
}));

const MOCK_PRINTER = {
  id: "printer-1",
  name: "Impresora Principal",
  type: "THERMAL",
  connection: "USB",
  paperWidthMm: 80,
  endpointOrDevice: "/dev/usb/lp0",
  isActive: true,
  isDefault: true,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("printers-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchConfigurationPrinters", () => {
    it("should fetch printers with defaults", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ content: [MOCK_PRINTER], totalElements: 1, totalPages: 1, page: 0, size: 20 });

      const result = await fetchConfigurationPrinters({});

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/printers"),
        expect.any(Object),
      );
      expect(result.content).toHaveLength(1);
    });

    it("should pass filter params", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });

      await fetchConfigurationPrinters({ siteId: "site-1", q: "termica", active: true, page: 1, size: 10 });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("siteId=site-1"),
        expect.any(Object),
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("q=termica"),
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

  describe("createConfigurationPrinter", () => {
    it("should POST with siteId param", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_PRINTER);

      const result = await createConfigurationPrinter({ name: "Nueva Impresora", type: "THERMAL", connection: "USB" }, "site-1", "onboarding");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/printers?siteId=site-1"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toEqual(MOCK_PRINTER);
    });
  });

  describe("updateConfigurationPrinter", () => {
    it("should PUT updated printer", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      const updated = { ...MOCK_PRINTER, name: "Actualizada" };
      vi.mocked(apiFetch).mockResolvedValue(updated);

      const result = await updateConfigurationPrinter("printer-1", { name: "Actualizada" }, "rename");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/printers/printer-1"),
        expect.objectContaining({ method: "PUT" }),
      );
      expect(result.name).toBe("Actualizada");
    });
  });

  describe("patchConfigurationPrinterStatus", () => {
    it("should PATCH status as query param", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ ...MOCK_PRINTER, isActive: false });

      const result = await patchConfigurationPrinterStatus("printer-1", false, "disabled");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/printers/printer-1/status?active=false"),
        expect.objectContaining({ method: "PATCH" }),
      );
      expect(result.isActive).toBe(false);
    });
  });
});
