import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/_shared", () => ({
  apiV1Base: () => "http://localhost:6011/api/v1",
  apiFetch: vi.fn(),
  buildApiHeaders: () => Promise.resolve({ "Content-Type": "application/json" }),
  hdr: (r?: string) => (r?.trim() ? { auditReason: r.trim() } : undefined),
}));

const MOCK_THEME = {
  id: "theme-1",
  companyId: "company-1",
  primaryColor: "#000000",
  secondaryColor: "#ffffff",
  successColor: "#00ff00",
  warningColor: "#ffff00",
  dangerColor: "#ff0000",
  themeMode: "light" as const,
  logoUrl: null,
  faviconUrl: null,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: null,
};

describe("theme-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchThemeConfig", () => {
    it("GETs /configuration/theme with companyId", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_THEME);

      const { fetchThemeConfig } = await import("@/lib/api/theme-api");
      const result = await fetchThemeConfig("company-1");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/theme?companyId=company-1"),
        expect.objectContaining({ cache: "no-store" }),
      );
      expect(result).toEqual(MOCK_THEME);
    });
  });

  describe("saveThemeConfig", () => {
    it("PUTs to /configuration/theme with companyId and payload", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      const payload = {
        primaryColor: "#ff0000",
        secondaryColor: "#00ff00",
        successColor: "#0000ff",
        warningColor: "#ff00ff",
        dangerColor: "#ffff00",
        themeMode: "dark" as const,
      };
      vi.mocked(apiFetch).mockResolvedValue({ ...MOCK_THEME, ...payload });

      const { saveThemeConfig } = await import("@/lib/api/theme-api");
      const result = await saveThemeConfig("company-1", payload);

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/theme?companyId=company-1"),
        expect.objectContaining({ method: "PUT" }),
      );
      expect(result).toEqual({ ...MOCK_THEME, ...payload });
    });
  });

  describe("uploadThemeLogo", () => {
    it("POSTs FormData to /configuration/theme/logo", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({ ...MOCK_THEME, logoUrl: "http://cdn/logo.png" });

      const { uploadThemeLogo } = await import("@/lib/api/theme-api");
      const file = new File(["test"], "logo.png", { type: "image/png" });
      const result = await uploadThemeLogo("company-1", file);

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/theme/logo?companyId=company-1"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.logoUrl).toBe("http://cdn/logo.png");
    });
  });

  describe("removeThemeLogo", () => {
    it("DELETEs /configuration/theme/logo", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_THEME);

      const { removeThemeLogo } = await import("@/lib/api/theme-api");
      const result = await removeThemeLogo("company-1");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/theme/logo?companyId=company-1"),
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(result).toEqual(MOCK_THEME);
    });
  });

  describe("uploadThemeFavicon", () => {
    it("POSTs FormData to /configuration/theme/favicon", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue({
        ...MOCK_THEME,
        faviconUrl: "http://cdn/favicon.ico",
      });

      const { uploadThemeFavicon } = await import("@/lib/api/theme-api");
      const file = new File(["test"], "favicon.ico", { type: "image/x-icon" });
      const result = await uploadThemeFavicon("company-1", file);

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/theme/favicon?companyId=company-1"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.faviconUrl).toBe("http://cdn/favicon.ico");
    });
  });

  describe("removeThemeFavicon", () => {
    it("DELETEs /configuration/theme/favicon", async () => {
      const { apiFetch } = await import("@/lib/api/_shared");
      vi.mocked(apiFetch).mockResolvedValue(MOCK_THEME);

      const { removeThemeFavicon } = await import("@/lib/api/theme-api");
      const result = await removeThemeFavicon("company-1");

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/configuration/theme/favicon?companyId=company-1"),
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(result).toEqual(MOCK_THEME);
    });
  });
});
