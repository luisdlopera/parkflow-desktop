import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MonitoringPage from "../monitoring/page";

vi.mock("@/features/auth/api/auth.api", () => ({
  authHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test-token", "X-API-Key": "test-key" }),
}));
vi.mock("@/features/auth/services/auth-storage.service", () => ({
  authHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test-token", "X-API-Key": "test-key" }),
}));
vi.mock("@/features/auth/services/auth-domain.service", () => ({
  authHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test-token", "X-API-Key": "test-key" }),
}));

const mockFetch = vi.fn();

describe("MonitoringPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("renders monitoring page title", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(<MonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText("Monitoreo")).toBeDefined();
    });
  });

  it("shows the Monitoreo title", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(<MonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText("Monitoreo")).toBeDefined();
    });
  });
});
