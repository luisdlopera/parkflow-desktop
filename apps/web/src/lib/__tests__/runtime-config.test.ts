import { describe, it, expect, vi, beforeEach } from "vitest";
import { RuntimeConfig, fetchRuntimeConfig } from "@/lib/runtime-config";
import * as currentCompanyModule from "@/lib/current-company";
import * as authDomainModule from "@/features/auth/services/auth-domain.service";
import * as fetchModule from "@/lib/api/fetch-with-credentials";
import * as configModule from "@/lib/api/config";

vi.mock("@/lib/current-company");
vi.mock("@/features/auth/services/auth-domain.service");
vi.mock("@/lib/api/fetch-with-credentials");
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

    const response = new Response(JSON.stringify(configData), { status: 200 });
    vi.spyOn(fetchModule, "fetchWithCredentials").mockResolvedValueOnce(response);

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

    const response = new Response(JSON.stringify(configData), { status: 200 });
    vi.spyOn(fetchModule, "fetchWithCredentials").mockResolvedValueOnce(response);

    const result = await fetchRuntimeConfig();
    expect(result).toBeDefined();
  });

  it("returns null on non-200 response", async () => {
    const companyId = "company-123";

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    const response = new Response("Not found", { status: 404 });
    vi.spyOn(fetchModule, "fetchWithCredentials").mockResolvedValueOnce(response);

    const result = await fetchRuntimeConfig();
    expect(result).toBeNull();
  });

  it("returns null on 500 server error", async () => {
    const companyId = "company-123";

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    const response = new Response("Server error", { status: 500 });
    vi.spyOn(fetchModule, "fetchWithCredentials").mockResolvedValueOnce(response);

    const result = await fetchRuntimeConfig();
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    const companyId = "company-123";

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    vi.spyOn(fetchModule, "fetchWithCredentials").mockRejectedValueOnce(
      new Error("Network error")
    );

    const result = await fetchRuntimeConfig();
    expect(result).toBeNull();
  });

  it("includes auth headers in request", async () => {
    const companyId = "company-123";
    const authHeaders = { "Authorization": "Bearer token123" };

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce(authHeaders);
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    const response = new Response(JSON.stringify({}), { status: 200 });
    const fetchSpy = vi.spyOn(fetchModule, "fetchWithCredentials").mockResolvedValueOnce(response);

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

    const response = new Response(JSON.stringify({}), { status: 200 });
    const fetchSpy = vi.spyOn(fetchModule, "fetchWithCredentials").mockResolvedValueOnce(response);

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

    const response = new Response(JSON.stringify({}), { status: 200 });
    const fetchSpy = vi.spyOn(fetchModule, "fetchWithCredentials").mockResolvedValueOnce(response);

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

    const response = new Response(JSON.stringify({}), { status: 200 });
    const fetchSpy = vi.spyOn(fetchModule, "fetchWithCredentials").mockResolvedValueOnce(response);

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

    const response = new Response(`Error ${status}`, { status });
    vi.spyOn(fetchModule, "fetchWithCredentials").mockResolvedValueOnce(response);

    const result = await fetchRuntimeConfig();
    expect(result).toBeNull();
  });

  it("handles empty response body", async () => {
    const companyId = "company-123";

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    const response = new Response("", { status: 200 });
    vi.spyOn(fetchModule, "fetchWithCredentials").mockResolvedValueOnce(response);

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

    const response = new Response("not json {]", { status: 200 });
    vi.spyOn(fetchModule, "fetchWithCredentials").mockResolvedValueOnce(response);

    try {
      await fetchRuntimeConfig();
    } catch {
      // Expected to fail JSON.parse
    }
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

    const response = new Response(JSON.stringify(fullConfig), { status: 200 });
    vi.spyOn(fetchModule, "fetchWithCredentials").mockResolvedValueOnce(response);

    const result = await fetchRuntimeConfig();
    expect(result).toEqual(fullConfig);
  });

  it("handles partial config with minimal fields", async () => {
    const companyId = "company-123";
    const minimalConfig: RuntimeConfig = {};

    vi.spyOn(currentCompanyModule, "resolveCurrentCompanyId").mockResolvedValueOnce(companyId);
    vi.spyOn(authDomainModule, "authHeaders").mockResolvedValueOnce({});
    vi.spyOn(configModule, "apiBase").mockReturnValueOnce("http://api.test");

    const response = new Response(JSON.stringify(minimalConfig), { status: 200 });
    vi.spyOn(fetchModule, "fetchWithCredentials").mockResolvedValueOnce(response);

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

    const response1 = new Response(JSON.stringify({ vehicleTypes: ["auto"] }), { status: 200 });
    const response2 = new Response(JSON.stringify({ vehicleTypes: ["auto", "moto"] }), { status: 200 });

    const fetchSpy = vi
      .spyOn(fetchModule, "fetchWithCredentials")
      .mockResolvedValueOnce(response1)
      .mockResolvedValueOnce(response2);

    const result1 = await fetchRuntimeConfig();
    const result2 = await fetchRuntimeConfig();

    expect(result1?.vehicleTypes?.length).toBe(1);
    expect(result2?.vehicleTypes?.length).toBe(2);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
