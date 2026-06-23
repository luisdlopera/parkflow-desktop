import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/auth/services/auth-domain.service", () => ({
  authHeaders: () => Promise.resolve({ Authorization: "Bearer test-token" }),
}));

vi.mock("@/lib/errors/normalize-api-error", () => ({
  normalizeApiError: (res: Response) => Promise.resolve(new Error(res.statusText)),
}));

vi.mock("@/lib/api/config", () => ({
  apiBase: () => "http://localhost:6011/api/v1",
}));

vi.mock("@/lib/api/fetch-with-credentials", () => ({
  fetchWithCredentials: vi.fn(),
}));

function okResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 200, statusText: "OK" });
}

function errorResponse(): Response {
  return new Response(JSON.stringify({ error: "fail" }), { status: 400, statusText: "Bad Request" });
}

const MOCK_STATUS = {
  companyId: "company-1",
  plan: "PRO" as const,
  onboardingCompleted: false,
  currentStep: 2,
  skipped: false,
  progressData: { siteCreated: true },
  availableOptionsByPlan: { maxSites: 5 },
  enabledSteps: [1, 2, 3, 4, 5],
};

describe("onboarding.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchOnboardingStatus", () => {
    it("should fetch onboarding status", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse(MOCK_STATUS));

      const { fetchOnboardingStatus } = await import("../onboarding.api");
      const result = await fetchOnboardingStatus("company-1");

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/onboarding/companies/company-1"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
            "X-Parkflow-Auth-Toast-Silent": "1",
          }),
        }),
      );
      expect(result.companyId).toBe("company-1");
    });

    it("should throw on error", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(errorResponse());

      const { fetchOnboardingStatus } = await import("../onboarding.api");
      await expect(fetchOnboardingStatus("company-1")).rejects.toThrow();
    });
  });

  describe("saveOnboardingStep", () => {
    it("should PUT step data", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse(MOCK_STATUS));

      const { saveOnboardingStep } = await import("../onboarding.api");
      const result = await saveOnboardingStep("company-1", 3, { siteName: "Sede 1" });

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/onboarding/companies/company-1/steps"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ step: 3, data: { siteName: "Sede 1" }, targetStep: undefined }),
        }),
      );
      expect(result.currentStep).toBe(2);
    });

    it("should pass targetStep when provided", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse(MOCK_STATUS));

      const { saveOnboardingStep } = await import("../onboarding.api");
      await saveOnboardingStep("company-1", 5, {}, 5);

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ step: 5, data: {}, targetStep: 5 }),
        }),
      );
    });
  });

  describe("skipOnboarding", () => {
    it("should POST skip", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      const skippedStatus = { ...MOCK_STATUS, skipped: true, onboardingCompleted: true };
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse(skippedStatus));

      const { skipOnboarding } = await import("../onboarding.api");
      const result = await skipOnboarding("company-1");

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/onboarding/companies/company-1/skip"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.skipped).toBe(true);
    });
  });

  describe("completeOnboarding", () => {
    it("should POST complete", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      const completedStatus = { ...MOCK_STATUS, onboardingCompleted: true };
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse(completedStatus));

      const { completeOnboarding } = await import("../onboarding.api");
      const result = await completeOnboarding("company-1");

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/onboarding/companies/company-1/complete"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.onboardingCompleted).toBe(true);
    });
  });

  describe("resetOnboarding", () => {
    it("should POST reset with reason", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      const resetStatus = { ...MOCK_STATUS, currentStep: 1 };
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse(resetStatus));

      const { resetOnboarding } = await import("../onboarding.api");
      const result = await resetOnboarding("company-1", "Testing");

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/onboarding/companies/company-1/reset?reason=Testing"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.currentStep).toBe(1);
    });

    it("should use default reason", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse(MOCK_STATUS));

      const { resetOnboarding } = await import("../onboarding.api");
      await resetOnboarding("company-1");

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("reason=Reinicio%20manual"),
        expect.any(Object),
      );
    });
  });
});
