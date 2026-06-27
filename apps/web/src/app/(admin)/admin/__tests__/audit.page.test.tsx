import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AuditPage from "../audit/page";

vi.mock("@/features/auth/api/auth.api", () => ({
  authHeaders: vi.fn().mockResolvedValue({ "Content-Type": "application/json", "X-API-Key": "test-key" }),
}));
vi.mock("@/lib/services/auth-storage.service", () => ({
  authHeaders: vi.fn().mockResolvedValue({ "Content-Type": "application/json", "X-API-Key": "test-key" }),
}));
vi.mock("@/lib/services/auth-domain.service", () => ({
  authHeaders: vi.fn().mockResolvedValue({ "Content-Type": "application/json", "X-API-Key": "test-key" }),
}));

const mockFetch = vi.fn();

describe("AuditPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          { id: "audit-1", action: "COMPANY_CREATED", description: "Empresa creada",
            performedBy: "admin@test.com", createdAt: "2026-05-01T00:00:00Z",
            oldValue: null, newValue: null, companyName: "Test Corp" },
        ],
        totalPages: 1,
        totalElements: 1,
        size: 20,
        number: 0,
      }),
    });
  });

  it("renders the audit page title", async () => {
    render(<AuditPage />);

    await waitFor(() => {
      expect(screen.getByText("Auditoría")).toBeDefined();
    });
  });

  it("renders audit log entries", async () => {
    render(<AuditPage />);

    await waitFor(() => {
      expect(screen.getByText("Company Created")).toBeDefined();
    });
  });
});
