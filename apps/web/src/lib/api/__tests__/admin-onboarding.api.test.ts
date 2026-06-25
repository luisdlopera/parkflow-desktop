import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/auth-domain.service", () => ({
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

const MOCK_QUESTION = {
  id: "q-1",
  stepNumber: 1,
  title: "Datos de la empresa",
  description: "Ingrese los datos básicos",
  enabled: true,
  required: true,
  planRestricted: false,
};

describe("admin-onboarding.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchOnboardingQuestions", () => {
    it("should fetch all questions", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse([MOCK_QUESTION]));

      const { fetchOnboardingQuestions } = await import("../admin-onboarding.api");
      const result = await fetchOnboardingQuestions();

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/admin/onboarding-questions"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it("should throw on error", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(errorResponse());

      const { fetchOnboardingQuestions } = await import("../admin-onboarding.api");
      await expect(fetchOnboardingQuestions()).rejects.toThrow();
    });
  });

  describe("fetchEnabledOnboardingQuestions", () => {
    it("should fetch enabled questions only", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse([MOCK_QUESTION]));

      const { fetchEnabledOnboardingQuestions } = await import("../admin-onboarding.api");
      const result = await fetchEnabledOnboardingQuestions();

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/admin/onboarding-questions/enabled"),
        expect.any(Object),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("saveOnboardingQuestion", () => {
    it("should POST a new question", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse(MOCK_QUESTION));

      const { saveOnboardingQuestion } = await import("../admin-onboarding.api");
      const result = await saveOnboardingQuestion(MOCK_QUESTION);

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/admin/onboarding-questions"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(MOCK_QUESTION),
        }),
      );
      expect(result.id).toBe("q-1");
    });
  });

  describe("batchSaveOnboardingQuestions", () => {
    it("should PUT batch of questions", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(okResponse([MOCK_QUESTION]));

      const { batchSaveOnboardingQuestions } = await import("../admin-onboarding.api");
      const result = await batchSaveOnboardingQuestions([MOCK_QUESTION]);

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/admin/onboarding-questions/batch"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify([MOCK_QUESTION]),
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("seedOnboardingQuestions", () => {
    it("should POST seed", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(new Response("{}", { status: 200, statusText: "OK" }));

      const { seedOnboardingQuestions } = await import("../admin-onboarding.api");
      await seedOnboardingQuestions();

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/admin/onboarding-questions/seed"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("deleteOnboardingQuestion", () => {
    it("should DELETE a question", async () => {
      const { fetchWithCredentials } = await import("@/lib/api/fetch-with-credentials");
      vi.mocked(fetchWithCredentials).mockResolvedValue(new Response("{}", { status: 200, statusText: "OK" }));

      const { deleteOnboardingQuestion } = await import("../admin-onboarding.api");
      await deleteOnboardingQuestion("q-1");

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/admin/onboarding-questions/q-1"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });
});
