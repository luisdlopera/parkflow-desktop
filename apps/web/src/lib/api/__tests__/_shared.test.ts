import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  buildApiHeaders: vi.fn(),
  AuthHeaderOptions: {} as any,
}));

vi.mock("@/lib/api/config", () => ({
  apiBase: vi.fn().mockReturnValue("http://localhost:6011/api/v1"),
  cfgBase: vi.fn().mockReturnValue("http://localhost:6011/api/v1/configuration"),
}));

vi.mock("@/lib/api/fetch", () => ({
  default: vi.fn(),
}));

describe("_shared", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("apiV1Base", () => {
    it("returns the apiBase URL", async () => {
      const { apiV1Base } = await import("@/lib/api/_shared");
      const { apiBase } = await import("@/lib/api/config");

      vi.mocked(apiBase).mockReturnValue("http://test:6011/api/v1");
      expect(apiV1Base()).toBe("http://test:6011/api/v1");
    });
  });

  describe("cfgBase", () => {
    it("returns the configuration base URL", async () => {
      const { cfgBase } = await import("@/lib/api/_shared");
      expect(cfgBase()).toBe("http://localhost:6011/api/v1/configuration");
    });
  });

  describe("buildApiHeaders", () => {
    it("delegates to the imported buildApiHeaders", async () => {
      const { buildApiHeaders } = await import("@/lib/api/_shared");
      const mockHeaders = { "Content-Type": "application/json", Authorization: "Bearer x" };
      const mockedApi = await import("@/lib/api");
      vi.mocked(mockedApi.buildApiHeaders).mockResolvedValue(mockHeaders);

      const result = await buildApiHeaders();
      expect(result).toEqual(mockHeaders);
    });
  });

  describe("hdr", () => {
    it("returns undefined for empty string", async () => {
      const { hdr } = await import("@/lib/api/_shared");
      expect(hdr("")).toBeUndefined();
    });

    it("returns undefined for whitespace-only string", async () => {
      const { hdr } = await import("@/lib/api/_shared");
      expect(hdr("   ")).toBeUndefined();
    });

    it("returns undefined when called without arguments", async () => {
      const { hdr } = await import("@/lib/api/_shared");
      expect(hdr()).toBeUndefined();
    });

    it("returns options with auditReason for non-empty string", async () => {
      const { hdr } = await import("@/lib/api/_shared");
      const result = hdr("Testing reason");
      expect(result).toEqual({ auditReason: "Testing reason" });
    });

    it("trims the audit reason", async () => {
      const { hdr } = await import("@/lib/api/_shared");
      expect(hdr("  trimmed  ")).toEqual({ auditReason: "trimmed" });
    });
  });

  describe("apiFetch", () => {
    it("delegates to safeFetch and returns result", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      const safeFetch = (await import("@/lib/api/fetch")).default;
      vi.mocked(safeFetch).mockResolvedValue({ data: "test" });

      const result = await apiFetch("http://test/api", { method: "GET" });
      expect(safeFetch).toHaveBeenCalledWith("http://test/api", { method: "GET" });
      expect(result).toEqual({ data: "test" });
    });
  });
});
