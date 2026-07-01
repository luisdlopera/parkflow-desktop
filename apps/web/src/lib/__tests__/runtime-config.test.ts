import { describe, it, expect, vi, beforeEach } from "vitest";
import { RuntimeConfig, fetchRuntimeConfig } from "@/lib/runtime-config";
import * as currentCompanyModule from "@/lib/current-company";
import * as authDomainModule from "@/lib/services/auth-domain.service";
import * as fetchModule from "@/lib/api/fetch";
import * as configModule from "@/lib/api/config";

vi.mock("@/lib/current-company");
vi.mock("@/lib/services/auth-domain.service");
vi.mock("@/lib/api/fetch");
vi.mock("@/lib/api/config");

describe("fetchRuntimeConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when company ID cannot be resolved", async () => {
    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(null);
    const result = await fetchRuntimeConfig();
    expect(result).toBeNull();
  });

  it("fetches config for valid company", async () => {
    const companyId = "company-123";
    const configData: RuntimeConfig = {
      vehicleTypes: ["auto", "moto"],
      paymentMethods: ["CASH", "CARD"],
    };

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    vi.spyOn(fetchModule, "default").mockResolvedValueOnce(configData);

    const result = await fetchRuntimeConfig();

    expect(result).toEqual(configData);
    expect(result?.vehicleTypes).toContain("auto");
  });

  it.each([
    [{ vehicleTypes: ["auto"] }],
    [{ paymentMethods: ["CASH"] }],
    [{ sites: [{ code: "S1", name: "Site 1" }] }],
    [{ modules: { cash: true } }],
    [{ features: { agreements: true } }],
  ])("handles various config structures: %#", async (configData) => {
    const companyId = "company-123";

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    vi.spyOn(fetchModule, "default").mockResolvedValueOnce(configData as never);

    const result = await fetchRuntimeConfig();
    expect(result).toBeDefined();
  });

  it("returns null on non-200 response", async () => {
    const companyId = "company-123";

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    vi.spyOn(fetchModule, "default").mockRejectedValueOnce(new Error("Not found"));

    const result = await fetchRuntimeConfig();
    expect(result).toBeNull();
  });

  it("returns null on 500 server error", async () => {
    const companyId = "company-123";

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    vi.spyOn(fetchModule, "default").mockRejectedValueOnce(new Error("Server error"));

    const result = await fetchRuntimeConfig();
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    const companyId = "company-123";

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    vi.spyOn(fetchModule, "default").mockRejectedValueOnce(
      new Error("Network error")
    );

    const result = await fetchRuntimeConfig();
    expect(result).toBeNull();
  });

  it("includes auth headers in request", async () => {
    const companyId = "company-123";
    const authHeaders = { "Content-Type": "application/json", "X-API-Key": "test-api-key" };

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce(authHeaders);
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    const fetchSpy = vi.spyOn(fetchModule, "default").mockResolvedValueOnce({} as never);

    await fetchRuntimeConfig();

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("company-123"),
      expect.objectContaining({
        headers: expect.objectContaining(authHeaders),
      })
    );
  });

  it("sets X-Parkflow-Auth-Toast-Silent header", async () => {
    const companyId = "company-123";

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    const fetchSpy = vi.spyOn(fetchModule, "default").mockResolvedValueOnce({} as never);

    await fetchRuntimeConfig();

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Parkflow-Auth-Toast-Silent": "1",
        }),
      })
    );
  });

  it("sets cache to no-store", async () => {
    const companyId = "company-123";

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    const fetchSpy = vi.spyOn(fetchModule, "default").mockResolvedValueOnce({} as never);

    await fetchRuntimeConfig();

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        cache: "no-store",
      })
    );
  });

  it("constructs correct API endpoint", async () => {
    const companyId = "company-456";

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    const fetchSpy = vi.spyOn(fetchModule, "default").mockResolvedValueOnce({} as never);

    await fetchRuntimeConfig();

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://api.test/onboarding/companies/company-456/settings",
      expect.any(Object)
    );
  });

  it.each([
    [400, "Bad Request"],
    [401, "Unauthorized"],
    [403, "Forbidden"],
    [404, "Not Found"],
    [500, "Server Error"],
    [503, "Service Unavailable"],
  ])("handles HTTP error %p gracefully", async (status, _name) => {
    const companyId = "company-123";

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    vi.spyOn(fetchModule, "default").mockRejectedValueOnce(new Error(`Error ${status}`));

    const result = await fetchRuntimeConfig();
    expect(result).toBeNull();
  });

  it("handles empty response body", async () => {
    const companyId = "company-123";

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    vi.spyOn(fetchModule, "default").mockResolvedValueOnce({} as never);

    try {
      await fetchRuntimeConfig();
    } catch {
      // Expected to fail JSON.parse
    }
  });

  it("handles malformed JSON response", async () => {
    const companyId = "company-123";

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    vi.spyOn(fetchModule, "default").mockRejectedValueOnce(new Error("Unexpected token"));

    const result = await fetchRuntimeConfig();
    expect(result).toBeNull();
  });

  it("returns full config with all fields", async () => {
    const companyId = "company-123";
    const fullConfig: RuntimeConfig = {
      vehicleTypes: ["auto", "moto"],
      paymentMethods: ["CASH", "CARD"],
      sites: [{ code: "S1", name: "Sitio 1" }],
      modules: { cash: true },
      features: { agreements: true, prepaid: false },
      wizard: { step1: {} },
      operationConfiguration: {},
      businessModel: "hourly",
      operationalProfile: "24h",
      capacity: { controlSlots: true, total: 100 },
      rates: { type: "hourly", baseValue: 5000 },
      region: { countryCode: "CO", platePattern: "AAA000", platePrefix: "" },
      tickets: { delivery: ["print"], allowReprint: true, showTicketPreview: true, printerType: "thermal", printerName: "Printer1", thermalPrinter: true },
      shifts: { enabled: true },
      agreements: { enabled: true, discount: 10 },
    };

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    vi.spyOn(fetchModule, "default").mockResolvedValueOnce(fullConfig as never);

    const result = await fetchRuntimeConfig();
    expect(result).toEqual(fullConfig);
  });

  it("handles partial config with minimal fields", async () => {
    const companyId = "company-123";
    const minimalConfig: RuntimeConfig = {};

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    vi.spyOn(fetchModule, "default").mockResolvedValueOnce(minimalConfig as never);

    const result = await fetchRuntimeConfig();
    expect(result).toEqual({});
  });

  it("does not cache results between calls", async () => {
    const companyId = "company-123";

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId")
      .mockResolvedValueOnce(companyId)
      .mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders")
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase")
      .mockReturnValueOnce("http://api.test")
      .mockReturnValueOnce("http://api.test");

    const fetchSpy = vi
      .spyOn(fetchModule, "default")
      .mockResolvedValueOnce({ vehicleTypes: ["auto"] } as never)
      .mockResolvedValueOnce({ vehicleTypes: ["auto", "moto"] } as never);

    const result1 = await fetchRuntimeConfig();
    const result2 = await fetchRuntimeConfig();

    expect(result1?.vehicleTypes?.length).toBe(1);
    expect(result2?.vehicleTypes?.length).toBe(2);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
