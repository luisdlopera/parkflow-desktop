import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LicensesPage from "../licenses/page";

const mockHooks = vi.hoisted(() => {
  const mockUseCompanies = vi.fn();

  mockUseCompanies.mockReturnValue({
    data: [
      { id: "c1", name: "Empresa Alpha", plan: "SYNC", status: "ACTIVE",
        maxDevices: 5, maxLocations: 3, maxUsers: 10, offlineModeAllowed: true,
        offlineLeaseHours: 48,
        devices: [
          { id: "d1", deviceFingerprint: "fp-abc", status: "ACTIVE", hostname: "PC-01",
            lastHeartbeatAt: "2026-05-12T10:00:00Z", heartbeatCount: 150, pendingSyncEvents: 0,
            syncedEvents: 1420, createdAt: "2026-01-01T00:00:00Z", isCurrentlyOnline: true },
        ],
        modules: [{ id: "m1", moduleType: "CLOUD_SYNC", enabled: true, active: true }],
        createdAt: "2026-01-01T00:00:00Z",
        expiresAt: "2027-01-01T00:00:00Z",
      },
    ],
    isLoading: false,
    error: null,
    mutate: vi.fn(),
  });

  return { mockUseCompanies };
});

vi.mock("@/lib/licensing/hooks", () => ({
  useCompanies: mockHooks.mockUseCompanies,
  translatePlan: (plan: string) =>
    ({ SYNC: "Sync / Cloud", PRO: "Pro / Multi-sede", LOCAL: "Local / Offline" })[plan] || plan,
  translateStatus: (status: string) =>
    ({ ACTIVE: "Activa", EXPIRED: "Expirada" })[status] || status,
}));

describe("LicensesPage", () => {
  it("renders the licenses page with company data", () => {
    render(<LicensesPage />);
    expect(screen.getByText("Licencias")).toBeDefined();
    expect(screen.getByText("Empresa Alpha")).toBeDefined();
    expect(screen.getByText("Sync / Cloud")).toBeDefined();
    expect(screen.getByText("Activa")).toBeDefined();
  });

  it("shows stats cards", () => {
    render(<LicensesPage />);
    expect(screen.getByText("Total Licencias")).toBeDefined();
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
  });
});
