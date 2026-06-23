import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveCurrentCompanyId } from "@/lib/current-company";

// Mock the auth-storage module
vi.mock("@/features/auth/services/auth-storage.service", () => ({
  loadSession: vi.fn(),
}));

import { loadSession } from "@/features/auth/services/auth-storage.service";

const mockLoadSession = loadSession as any;

describe("resolveCurrentCompanyId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when session is not available", async () => {
    mockLoadSession.mockResolvedValueOnce(null);
    const result = await resolveCurrentCompanyId();
    expect(result).toBeNull();
  });

  it("returns companyId from user when available", async () => {
    mockLoadSession.mockResolvedValueOnce({
      user: { companyId: "company-123" },
    });
    const result = await resolveCurrentCompanyId();
    expect(result).toBe("company-123");
  });

  it.each([
    ["company-1"],
    ["company-abc123"],
    ["12345"],
    ["c1"],
    ["very-long-company-id-with-many-chars"],
  ])("handles various company ID formats: %p", async (companyId) => {
    mockLoadSession.mockResolvedValueOnce({
      user: { companyId },
    });
    const result = await resolveCurrentCompanyId();
    expect(result).toBe(companyId);
  });

  it("returns null when session exists but no user", async () => {
    mockLoadSession.mockResolvedValueOnce({ user: null });
    const result = await resolveCurrentCompanyId();
    expect(result).toBeNull();
  });

  it("returns null when user exists but no companyId", async () => {
    mockLoadSession.mockResolvedValueOnce({
      user: { email: "user@example.com" },
    });
    const result = await resolveCurrentCompanyId();
    expect(result).toBeNull();
  });

  it("returns null when companyId is empty string", async () => {
    mockLoadSession.mockResolvedValueOnce({
      user: { companyId: "" },
    });
    const result = await resolveCurrentCompanyId();
    expect(result).toBeNull();
  });

  it("returns null when companyId is null", async () => {
    mockLoadSession.mockResolvedValueOnce({
      user: { companyId: null },
    });
    const result = await resolveCurrentCompanyId();
    expect(result).toBeNull();
  });

  it("returns null when companyId is undefined", async () => {
    mockLoadSession.mockResolvedValueOnce({
      user: { companyId: undefined },
    });
    const result = await resolveCurrentCompanyId();
    expect(result).toBeNull();
  });

  it("handles malformed session object", async () => {
    mockLoadSession.mockResolvedValueOnce({});
    const result = await resolveCurrentCompanyId();
    expect(result).toBeNull();
  });

  it("calls loadSession once per invocation", async () => {
    mockLoadSession.mockResolvedValueOnce({
      user: { companyId: "company-123" },
    });
    await resolveCurrentCompanyId();
    expect(mockLoadSession).toHaveBeenCalledTimes(1);
  });

  it("does not cache results between calls", async () => {
    mockLoadSession.mockResolvedValueOnce({
      user: { companyId: "company-1" },
    });
    const result1 = await resolveCurrentCompanyId();

    mockLoadSession.mockResolvedValueOnce({
      user: { companyId: "company-2" },
    });
    const result2 = await resolveCurrentCompanyId();

    expect(result1).toBe("company-1");
    expect(result2).toBe("company-2");
    expect(mockLoadSession).toHaveBeenCalledTimes(2);
  });

  it("preserves whitespace in companyId", async () => {
    mockLoadSession.mockResolvedValueOnce({
      user: { companyId: "company 123" },
    });
    const result = await resolveCurrentCompanyId();
    expect(result).toBe("company 123");
  });

  it("preserves special characters in companyId", async () => {
    mockLoadSession.mockResolvedValueOnce({
      user: { companyId: "company-123_456.789" },
    });
    const result = await resolveCurrentCompanyId();
    expect(result).toBe("company-123_456.789");
  });

  it.each([
    [{ user: { companyId: "company-1", email: "test@test.com" } }],
    [{ user: { companyId: "company-2", name: "Test Company", email: "admin@test.com" } }],
    [{ user: { companyId: "company-3", roles: ["ADMIN", "USER"] } }],
  ])("extracts companyId from complex session object: %#", async (session) => {
    mockLoadSession.mockResolvedValueOnce(session);
    const result = await resolveCurrentCompanyId();
    expect(result).toBe(session.user.companyId);
  });

  it("handles rejection from loadSession", async () => {
    mockLoadSession.mockRejectedValueOnce(new Error("Session load failed"));
    try {
      await resolveCurrentCompanyId();
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  it("returns string type or null", async () => {
    mockLoadSession.mockResolvedValueOnce({
      user: { companyId: "company-123" },
    });
    const result = await resolveCurrentCompanyId();
    expect(typeof result === "string" || result === null).toBe(true);
  });

  it("handles numeric companyId", async () => {
    mockLoadSession.mockResolvedValueOnce({
      user: { companyId: "12345" },
    });
    const result = await resolveCurrentCompanyId();
    expect(result).toBe("12345");
  });

  it("handles UUID format companyId", async () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    mockLoadSession.mockResolvedValueOnce({
      user: { companyId: uuid },
    });
    const result = await resolveCurrentCompanyId();
    expect(result).toBe(uuid);
  });
});
