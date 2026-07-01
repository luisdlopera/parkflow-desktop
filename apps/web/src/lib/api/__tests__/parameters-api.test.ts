import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchParameters,
  validateParameters,
  putParameters,
  resetParameters,
} from "../parameters-api";

vi.mock("@/lib/api/_shared", () => ({
  apiV1Base: () => "http://localhost:6011/api/v1",
  apiFetch: vi.fn(),
  buildApiHeaders: () => Promise.resolve({ "Content-Type": "application/json" }),
  hdr: (r?: string) => (r?.trim() ? { auditReason: r.trim() } : undefined),
}));

vi.mock("@/lib/validation/request-guard", () => ({
  validatePayloadOrThrow: (_schema: unknown, payload: unknown) => payload,
}));

vi.mock("@/lib/validation/contracts", () => ({
  settingsParametersSchema: { parse: (v: unknown) => v },
}));

const MOCK_PARAMS = {
  parkingName: "Parqueadero Central",
  taxId: "123456789",
  address: "Calle 123",
  currency: "COP",
  timeZone: "America/Bogota",
  logoUrl: null,
  brandColor: "#2563EB",
  taxName: "IVA",
  taxRatePercent: 19,
  pricesIncludeTax: true,
  graceMinutesDefault: 5,
  lostTicketPolicy: "DAILY_MAX",
  allowReprint: true,
  maxReprints: 3,
  ticketPrefix: "PK",
  ticketFormat: "STANDARD",
  defaultPaperWidthMm: 80,
  defaultPrinterName: "Impresora Principal",
  offlineModeEnabled: false,
  syncIntervalSeconds: 30,
  printTimeoutSeconds: 10,
  ticketHeaderMessage: "Bienvenido",
  ticketLegalMessage: "Legal",
  ticketFooterMessage: "Gracias",
  operationRulesMessage: "Reglas",
  qrConfig: null,
  manualExitAllowed: true,
  allowOfflineEntryExit: false,
  printExitTicket: true,
  cashRequireOpenForPayment: true,
  cashOfflineCloseAllowed: false,
  cashOfflineMaxManualMovement: null,
  cashMaxManualAdjustment: null,
  cashMaxSessionHours: 12,
  cashFeOutboundWebhookUrl: null,
  businessLegalName: "ParkFlow SAS",
  taxIdCheckDigit: "5",
  dianInvoicePrefix: "PF",
  dianResolutionNumber: "12345",
  dianResolutionDate: "2025-01-01",
  dianRangeFrom: "1",
  dianRangeTo: "1000",
  dianTechnicalKey: "key123",
  cashFeSequentialEnabled: false,
  cashFeSequencePerTerminal: false,
  cashFeSequenceDigits: 4,
  cashFeOutboundWebhookBearer: null,
};

describe("parameters-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchParameters", () => {
    it("should fetch parameters without site", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_PARAMS);

      const result = await fetchParameters();

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/parameters"),
        expect.objectContaining({ cache: "no-store" }),
      );
      expect(result.parkingName).toBe("Parqueadero Central");
    });

    it("should pass site query param", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_PARAMS);

      await fetchParameters("site-1");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("site=site-1"),
        expect.any(Object),
      );
    });
  });

  describe("validateParameters", () => {
    it("should POST to validate endpoint", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ ok: true, errors: [] });

      const result = await validateParameters({ parkingName: "Test" });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/parameters/validate"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.ok).toBe(true);
    });

    it("should return validation errors", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({
        ok: false,
        errors: ["parkingName es requerido"],
      });

      const result = await validateParameters({});

      expect(result.ok).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("putParameters", () => {
    it("should PUT parameters without site", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_PARAMS);

      const result = await putParameters({ parkingName: "Actualizado" });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/parameters"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ parkingName: "Actualizado" }),
        }),
      );
      expect(result.parkingName).toBe("Parqueadero Central");
    });

    it("should pass site param", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_PARAMS);

      await putParameters({}, "site-1", "updated params");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("site=site-1"),
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("should call validatePayloadOrThrow before PUT", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_PARAMS);

      await putParameters({ parkingName: "Validado" });

      expect(apiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "PUT" }),
      );
    });
  });

  describe("resetParameters", () => {
    it("should POST to reset endpoint", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_PARAMS);

      const result = await resetParameters();

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/parameters/reset"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.parkingName).toBe("Parqueadero Central");
    });

    it("should pass site param", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_PARAMS);

      await resetParameters("site-1", "reset by admin");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("site=site-1"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
