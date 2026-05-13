import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/licensing/hooks", async () => {
  const actual = await vi.importActual<typeof import("@/lib/licensing/hooks")>("@/lib/licensing/hooks");
  return {
    ...actual,
    useDesktopLicense: vi.fn(),
    useDeviceFingerprint: vi.fn(),
  };
});

vi.mock("./LicenseActivationDialog", () => ({
  LicenseActivationDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="license-dialog" /> : null,
}));

import { LicenseStatusCard } from "./LicenseStatusCard";
import { useDesktopLicense, useDeviceFingerprint } from "@/lib/licensing/hooks";

describe("LicenseStatusCard", () => {
  beforeEach(() => {
    vi.mocked(useDesktopLicense).mockReset();
    vi.mocked(useDeviceFingerprint).mockReset();
  });

  it("renders loading skeleton", () => {
    vi.mocked(useDesktopLicense).mockReturnValue({
      status: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
    });
    vi.mocked(useDeviceFingerprint).mockReturnValue({ fingerprint: null, loading: true });

    render(<LicenseStatusCard />);
    expect(screen.queryByText(/Sin licencia activa/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Error al cargar estado/i)).not.toBeInTheDocument();
  });

  it("renders error and retry action", () => {
    vi.mocked(useDesktopLicense).mockReturnValue({
      status: null,
      loading: false,
      error: "No se pudo cargar",
      refresh: vi.fn(),
    });
    vi.mocked(useDeviceFingerprint).mockReturnValue({ fingerprint: null, loading: false });

    render(<LicenseStatusCard />);

    expect(screen.getByText(/Error al cargar estado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reintentar/i })).toBeInTheDocument();
  });

  it("renders the inactive license state with fingerprint", () => {
    vi.mocked(useDesktopLicense).mockReturnValue({
      status: {
        hasLicense: false,
        isValid: false,
        statusMessage: "Sin licencia",
        companyName: undefined,
        plan: undefined,
        expiresAt: undefined,
        daysRemaining: undefined,
        gracePeriodActive: false,
        installedAt: undefined,
        showRenewalBanner: false,
        daysUntilBlock: undefined,
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    vi.mocked(useDeviceFingerprint).mockReturnValue({ fingerprint: "fp-device-1", loading: false });

    render(<LicenseStatusCard />);

    expect(screen.getByText(/Sin licencia activa/i)).toBeInTheDocument();
    expect(screen.getByText("fp-device-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Activar licencia/i })).toBeInTheDocument();
  });
});
