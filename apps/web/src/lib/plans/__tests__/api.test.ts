import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthHeaders = vi.fn();
const mockFetch = vi.fn();
const mockValidate = vi.fn();
const mockNormalizeError = vi.fn();

vi.mock("@/lib/services/auth-domain.service", () => ({
  authHeaders: mockAuthHeaders,
}));

vi.mock("@/lib/api/fetch-with-credentials", () => ({
  fetchWithCredentials: mockFetch,
}));

vi.mock("@/lib/errors/normalize-api-error", () => ({
  normalizeApiError: mockNormalizeError,
  handleNetworkError: (e: unknown) => e,
}));

function mockOkResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    statusText: "OK",
    headers: new Headers(),
  } as Response;
}

function mock204Response(): Response {
  return {
    ok: true,
    status: 204,
    json: () => Promise.resolve({}),
    statusText: "No Content",
  } as Response;
}

describe("plans api", () => {
  const FAKE_HEADERS = { "Content-Type": "application/json", "X-API-Key": "test-api-key" };

  const samplePlan = {
    id: "plan-1",
    code: "BASIC",
    name: "Basic Plan",
    monthlyPrice: 100,
    yearlyPrice: 1000,
    isActive: true,
    features: {
      clients: true,
      contracts: false,
      memberships: false,
      reports: false,
      appointments: false,
      attendanceControl: false,
      integrations: false,
      apiAccess: false,
      mobileAppAccess: false,
      billing: false,
      customBranding: false,
    },
    createdAt: "2026-01-01T00:00:00Z",
  };

  beforeEach(() => {
    mockAuthHeaders.mockResolvedValue(FAKE_HEADERS);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("listPlans", () => {
    it("fetches plans without query params", async () => {
      mockFetch.mockResolvedValue(mockOkResponse([samplePlan]));

      const { listPlans } = await import("../api");
      const result = await listPlans();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/admin\/plans$/),
        expect.any(Object)
      );
      expect(result).toEqual([samplePlan]);
    });

    it("passes includeDeleted and active filters", async () => {
      mockFetch.mockResolvedValue(mockOkResponse([]));

      const { listPlans } = await import("../api");
      await listPlans(true, true);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("includeDeleted=true"),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("active=true"),
        expect.any(Object)
      );
    });
  });

  describe("getPlan", () => {
    it("fetches single plan by id", async () => {
      mockFetch.mockResolvedValue(mockOkResponse(samplePlan));

      const { getPlan } = await import("../api");
      const result = await getPlan("plan-1");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/plans/plan-1"),
        expect.any(Object)
      );
      expect(result.id).toBe("plan-1");
    });
  });

  describe("createPlan", () => {
    it("creates plan with POST", async () => {
      mockFetch.mockResolvedValue(mockOkResponse(samplePlan));

      const { createPlan } = await import("../api");
      const result = await createPlan({
        name: "Basic Plan",
        monthlyPrice: 100,
        yearlyPrice: 1000,
        isActive: true,
        features: samplePlan.features,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/plans"),
        expect.objectContaining({ method: "POST" })
      );
      expect(result.id).toBe("plan-1");
    });
  });

  describe("updatePlan", () => {
    it("updates plan with PATCH", async () => {
      mockFetch.mockResolvedValue(mockOkResponse({ ...samplePlan, name: "Updated" }));

      const { updatePlan } = await import("../api");
      const result = await updatePlan("plan-1", {
        name: "Updated",
        monthlyPrice: 150,
        yearlyPrice: 1500,
        isActive: true,
        features: samplePlan.features,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/plans/plan-1"),
        expect.objectContaining({ method: "PATCH" })
      );
      expect(result.name).toBe("Updated");
    });
  });

  describe("deletePlan", () => {
    it("deletes plan with DELETE", async () => {
      mockFetch.mockResolvedValue(mock204Response());

      const { deletePlan } = await import("../api");
      await deletePlan("plan-1");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/plans/plan-1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("togglePlan", () => {
    it("toggles plan active state with PATCH", async () => {
      mockFetch.mockResolvedValue(mockOkResponse({ ...samplePlan, isActive: false }));

      const { togglePlan } = await import("../api");
      const result = await togglePlan("plan-1");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/plans/plan-1/toggle"),
        expect.objectContaining({ method: "PATCH" })
      );
      expect(result.isActive).toBe(false);
    });
  });

  describe("duplicatePlan", () => {
    it("duplicates plan with POST", async () => {
      const duplicated = { ...samplePlan, id: "plan-2", code: "BASIC_COPY" };
      mockFetch.mockResolvedValue(mockOkResponse(duplicated));

      const { duplicatePlan } = await import("../api");
      const result = await duplicatePlan("plan-1");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/plans/plan-1/duplicate"),
        expect.objectContaining({ method: "POST" })
      );
      expect(result.id).toBe("plan-2");
    });
  });
});
