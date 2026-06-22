import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchConfigurationPaymentMethods,
  createConfigurationPaymentMethod,
  updateConfigurationPaymentMethod,
  deleteConfigurationPaymentMethod,
  patchConfigurationPaymentMethodStatus,
} from "./payment-methods-api";
import type { PaymentMethodRow } from "./payment-methods-api";

vi.mock("@/lib/api/_shared", () => ({
  cfgBase: () => "http://localhost:6011/api/v1/configuration",
  apiFetch: vi.fn(),
  buildApiHeaders: () => Promise.resolve({ "Content-Type": "application/json" }),
  hdr: () => ({}),
}));

vi.mock("@/lib/schemas/config.schemas", () => ({
  paymentMethodSchema: {
    parse: (v: unknown) => v,
    partial: () => ({ parse: (v: unknown) => v }),
  },
}));

vi.mock("@/lib/validation/request-guard", () => ({
  validatePayloadOrThrow: (_schema: unknown, payload: unknown) => payload,
}));

describe("payment-methods-api", () => {
  const mockPaymentMethod: PaymentMethodRow = {
    id: "pm-1",
    name: "Efectivo",
    code: "CASH",
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch payment methods with default params", async () => {
    const { apiFetch } = await import("@/lib/api/_shared");
    vi.mocked(apiFetch).mockResolvedValueOnce({
      content: [mockPaymentMethod],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      size: 20,
    });

    const result = await fetchConfigurationPaymentMethods({});

    expect(result.content).toHaveLength(1);
    expect(result.content[0].name).toBe("Efectivo");
    expect(apiFetch).toHaveBeenCalled();
  });

  it("should fetch payment methods with filters", async () => {
    const { apiFetch } = await import("@/lib/api/_shared");
    vi.mocked(apiFetch).mockResolvedValueOnce({
      content: [],
      totalElements: 0,
      totalPages: 0,
      page: 0,
      size: 20,
    });

    await fetchConfigurationPaymentMethods({ q: "efectivo", active: true, page: 0, size: 50 });

    const callUrl = vi.mocked(apiFetch).mock.calls[0][0] as string;
    expect(callUrl).toContain("q=efectivo");
    expect(callUrl).toContain("active=true");
    expect(callUrl).toContain("size=50");
  });

  it("should create a payment method", async () => {
    const { apiFetch } = await import("@/lib/api/_shared");
    vi.mocked(apiFetch).mockResolvedValueOnce(mockPaymentMethod);

    const result = await createConfigurationPaymentMethod({ name: "Efectivo", code: "CASH" });

    expect(result.id).toBe("pm-1");
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining("/payment-methods"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("should update a payment method", async () => {
    const { apiFetch } = await import("@/lib/api/_shared");
    vi.mocked(apiFetch).mockResolvedValueOnce(mockPaymentMethod);

    const result = await updateConfigurationPaymentMethod("pm-1", { name: "Efectivo Actualizado" });

    expect(result.id).toBe("pm-1");
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining("/payment-methods/pm-1"),
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("should toggle payment method status", async () => {
    const { apiFetch } = await import("@/lib/api/_shared");
    vi.mocked(apiFetch).mockResolvedValueOnce(mockPaymentMethod);

    await patchConfigurationPaymentMethodStatus("pm-1", false);

    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining("/payment-methods/pm-1/status?active=false"),
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("should delete a payment method", async () => {
    const { apiFetch } = await import("@/lib/api/_shared");
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    await deleteConfigurationPaymentMethod("pm-1");

    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining("/payment-methods/pm-1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
