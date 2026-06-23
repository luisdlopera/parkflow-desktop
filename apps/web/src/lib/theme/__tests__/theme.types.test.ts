import { describe, expect, it } from "vitest";

describe("theme types", () => {
  describe("DEFAULT_PRIMARY_COLOR", () => {
    it("has the expected default value", async () => {
      const { DEFAULT_PRIMARY_COLOR } = await import("../theme.types");
      expect(DEFAULT_PRIMARY_COLOR).toBe("#D97757");
    });
  });

  describe("sanitizePrimaryColor", () => {
    it("returns DEFAULT_PRIMARY_COLOR when given the legacy orange color", async () => {
      const { sanitizePrimaryColor, DEFAULT_PRIMARY_COLOR } = await import("../theme.types");
      const result = sanitizePrimaryColor("#f97316");
      expect(result).toBe(DEFAULT_PRIMARY_COLOR);
      expect(result).toBe("#D97757");
    });

    it("returns the same color for any other color", async () => {
      const { sanitizePrimaryColor } = await import("../theme.types");
      expect(sanitizePrimaryColor("#3B82F6")).toBe("#3B82F6");
      expect(sanitizePrimaryColor("#10B981")).toBe("#10B981");
      expect(sanitizePrimaryColor("#000000")).toBe("#000000");
    });

    it("preserves case-sensitivity of hex values", async () => {
      const { sanitizePrimaryColor } = await import("../theme.types");
      const result = sanitizePrimaryColor("#FF5733");
      expect(result).toBe("#FF5733");
    });

    it("returns non-hex strings unchanged", async () => {
      const { sanitizePrimaryColor } = await import("../theme.types");
      expect(sanitizePrimaryColor("invalid")).toBe("invalid");
      expect(sanitizePrimaryColor("")).toBe("");
    });
  });
});
