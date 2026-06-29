import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  isMutatingMethod,
  readCsrfTokenFromCookie,
  withCsrfHeader,
} from "@/lib/api/csrf";

describe("csrf helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constants", () => {
    it("exposes the Spring Security defaults", () => {
      expect(CSRF_COOKIE_NAME).toBe("XSRF-TOKEN");
      expect(CSRF_HEADER_NAME).toBe("X-XSRF-TOKEN");
    });
  });

  describe("isMutatingMethod", () => {
    it("flags POST/PUT/PATCH/DELETE as mutating", () => {
      expect(isMutatingMethod("POST")).toBe(true);
      expect(isMutatingMethod("post")).toBe(true);
      expect(isMutatingMethod("PUT")).toBe(true);
      expect(isMutatingMethod("PATCH")).toBe(true);
      expect(isMutatingMethod("DELETE")).toBe(true);
    });

    it("does not flag GET/HEAD/OPTIONS/TRACE as mutating", () => {
      expect(isMutatingMethod("GET")).toBe(false);
      expect(isMutatingMethod("HEAD")).toBe(false);
      expect(isMutatingMethod("OPTIONS")).toBe(false);
      expect(isMutatingMethod("TRACE")).toBe(false);
    });

    it("treats null/undefined as not-mutating", () => {
      expect(isMutatingMethod(undefined)).toBe(false);
      expect(isMutatingMethod(null)).toBe(false);
      expect(isMutatingMethod("")).toBe(false);
    });
  });

  describe("readCsrfTokenFromCookie", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("returns null in non-browser environments", () => {
      const originalDocument = globalThis.document;
      // @ts-expect-error -- simulate SSR / Node by removing document
      delete globalThis.document;
      expect(readCsrfTokenFromCookie()).toBeNull();
      globalThis.document = originalDocument;
    });

    it("returns null when the XSRF-TOKEN cookie is absent", () => {
      vi.stubGlobal("document", {
        cookie: "parkflow_access=eyJhbGciOi; parkflow_refresh=def",
      });
      expect(readCsrfTokenFromCookie()).toBeNull();
    });

    it("returns the token when the XSRF-TOKEN cookie is present", () => {
      vi.stubGlobal("document", {
        cookie:
          "XSRF-TOKEN=abc123; parkflow_access=eyJ; parkflow_refresh=def",
      });
      expect(readCsrfTokenFromCookie()).toBe("abc123");
    });

    it("ignores leading whitespace between cookies", () => {
      vi.stubGlobal("document", {
        cookie: "parkflow_access=eyJ;  XSRF-TOKEN=token42; other=z",
      });
      expect(readCsrfTokenFromCookie()).toBe("token42");
    });

    it("returns null when the cookie value is empty", () => {
      vi.stubGlobal("document", {
        cookie: "XSRF-TOKEN=; other=z",
      });
      expect(readCsrfTokenFromCookie()).toBeNull();
    });
  });

  describe("withCsrfHeader", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("returns base headers unchanged for safe methods", () => {
      vi.stubGlobal("document", { cookie: "XSRF-TOKEN=abc" });
      const base = { "X-API-Key": "k1", "Content-Type": "application/json" };
      expect(withCsrfHeader({ method: "GET" }, base)).toEqual(base);
    });

    it("adds X-XSRF-TOKEN for POST when cookie present", () => {
      vi.stubGlobal("document", { cookie: "XSRF-TOKEN=abc" });
      const base = { "Content-Type": "application/json" };
      const result = withCsrfHeader({ method: "POST" }, base);
      expect(result).toEqual({
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": "abc",
      });
    });

    it("does not mutate the base headers object", () => {
      vi.stubGlobal("document", { cookie: "XSRF-TOKEN=abc" });
      const base = { "X-API-Key": "k1" };
      const result = withCsrfHeader({ method: "PUT" }, base);
      expect(result).not.toBe(base);
      expect(base).not.toHaveProperty("X-XSRF-TOKEN");
    });

    it("omits header on POST when cookie is missing", () => {
      vi.stubGlobal("document", { cookie: "" });
      const base = { "X-API-Key": "k1" };
      expect(withCsrfHeader({ method: "POST" }, base)).toEqual(base);
    });

    it("supports PATCH and DELETE", () => {
      vi.stubGlobal("document", { cookie: "XSRF-TOKEN=t" });
      expect(withCsrfHeader({ method: "PATCH" }, {} as Record<string, string>))
        .toEqual({ "X-XSRF-TOKEN": "t" });
      expect(withCsrfHeader({ method: "DELETE" }, {} as Record<string, string>))
        .toEqual({ "X-XSRF-TOKEN": "t" });
    });

    it("accepts lowercase method without warning", () => {
      vi.stubGlobal("document", { cookie: "XSRF-TOKEN=t" });
      expect(
        withCsrfHeader({ method: "post" }, {} as Record<string, string>),
      ).toEqual({ "X-XSRF-TOKEN": "t" });
    });
  });
});
