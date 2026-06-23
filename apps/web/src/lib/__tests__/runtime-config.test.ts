import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/current-company", () => ({
  resolveCurrentCompanyId: vi.fn(),
}));

vi.mock("@/features/auth/services/auth-domain.service", () => ({
  authHeaders: vi.fn(),
}));

vi.mock("@/lib/api/fetch-with-credentials", () => ({
  fetchWithCredentials: vi.fn(),
}));

vi.mock("@/lib/api/config", () => ({
  apiBase: () => "http://localhost:6011/api/v1",
}));

describe("fetchRuntimeConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no company ID is resolved", async () => {
    const { resolveCurrentCompanyId } = await import("@/lib/current-company");
    vi.mocked(resolveCurrentCompanyId).mockResolvedValue(null);

    const { fetchRuntimeConfig } = await import("@/lib/runtime-config");
    const result = await fetchRuntimeConfig();
    expect(result).toBeNull();
  });

  it("fetches config from correct endpoint with headers", async () => {
    const { resolveCurrentCompanyId } = await import("@/lib/current-company");
    const { authHeaders } = await import("@/features/auth/services/auth-domain.service");
    const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");

    vi.mocked(resolveCurrentCompanyId).mockResolvedValue("company-1");
    vi.mocked(authHeaders).mockResolvedValue({ "X-API-Key": "test-key" });
    vi.mocked(fetchWithCredentials).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ vehicleTypes: ["CAR", "MOTO"] }),
    } as any);

    const { fetchRuntimeConfig } = await import("@/lib/runtime-config");
    const result = await fetchRuntimeConfig();

    expect(fetchWithCredentials).toHaveBeenCalledWith(
      "http://localhost:6011/api/v1/onboarding/companies/company-1/settings",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Parkflow-Auth-Toast-Silent": "1" }),
        cache: "no-store",
      }),
    );
    expect(result).toEqual({ vehicleTypes: ["CAR", "MOTO"] });
  });

  it("returns config object on successful response", async () => {
    const { resolveCurrentCompanyId } = await import("@/lib/current-company");
    const { authHeaders } = await import("@/features/auth/services/auth-domain.service");
    const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");

    const mockConfig = {
      vehicleTypes: ["CAR", "MOTO"],
      paymentMethods: ["CASH", "QR"],
      businessModel: "PUBLIC",
    };

    vi.mocked(resolveCurrentCompanyId).mockResolvedValue("company-1");
    vi.mocked(authHeaders).mockResolvedValue({});
    vi.mocked(fetchWithCredentials).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockConfig),
    } as any);

    const { fetchRuntimeConfig } = await import("@/lib/runtime-config");
    const result = await fetchRuntimeConfig();

    expect(result).toEqual(mockConfig);
  });

  it("returns null on non-ok response", async () => {
    const { resolveCurrentCompanyId } = await import("@/lib/current-company");
    const { authHeaders } = await import("@/features/auth/services/auth-domain.service");
    const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");

    vi.mocked(resolveCurrentCompanyId).mockResolvedValue("company-1");
    vi.mocked(authHeaders).mockResolvedValue({});
    vi.mocked(fetchWithCredentials).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as any);

    const { fetchRuntimeConfig } = await import("@/lib/runtime-config");
    const result = await fetchRuntimeConfig();

    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    const { resolveCurrentCompanyId } = await import("@/lib/current-company");
    const { authHeaders } = await import("@/features/auth/services/auth-domain.service");
    const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");

    vi.mocked(resolveCurrentCompanyId).mockResolvedValue("company-1");
    vi.mocked(authHeaders).mockResolvedValue({});
    vi.mocked(fetchWithCredentials).mockRejectedValue(new Error("Network error"));

    const { fetchRuntimeConfig } = await import("@/lib/runtime-config");
    const result = await fetchRuntimeConfig();

    expect(result).toBeNull();
  });
});
