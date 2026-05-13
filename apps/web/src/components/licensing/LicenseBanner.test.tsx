import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/licensing/hooks", async () => {
  const actual = await vi.importActual<typeof import("@/lib/licensing/hooks")>("@/lib/licensing/hooks");
  return {
    ...actual,
    useDesktopLicense: vi.fn(),
  };
});

vi.mock("./LicenseActivationDialog", () => ({
  LicenseActivationDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="license-dialog" /> : null,
}));

import { LicenseBanner } from "./LicenseBanner";
import { useDesktopLicense } from "@/lib/licensing/hooks";

describe("LicenseBanner", () => {
  beforeEach(() => {
    vi.mocked(useDesktopLicense).mockReset();
  });

  it("hides itself while loading or when there is no warning", () => {
    vi.mocked(useDesktopLicense).mockReturnValue({
      status: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
    });

    const { container } = render(<LicenseBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a grace-period warning", () => {
    vi.mocked(useDesktopLicense).mockReturnValue({
      status: {
        hasLicense: true,
        isValid: true,
        statusMessage: "Licencia en período de gracia - Renueve pronto",
        companyName: "ParkFlow SA",
        plan: "PRO",
        expiresAt: "2026-06-12T00:00:00Z",
        daysRemaining: 3,
        gracePeriodActive: true,
        installedAt: "2026-05-12T00:00:00Z",
        showRenewalBanner: true,
        daysUntilBlock: 3,
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<LicenseBanner />);

    expect(screen.getByText("Licencia en período de gracia - Renueve pronto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Renovar ahora/i })).toBeInTheDocument();
    expect(screen.getByText("(Período de gracia)")).toBeInTheDocument();
  });

  it("renders an activation banner when the license is invalid", () => {
    vi.mocked(useDesktopLicense).mockReturnValue({
      status: {
        hasLicense: true,
        isValid: false,
        statusMessage: "Licencia expirada - Contacte a soporte",
        companyName: "ParkFlow SA",
        plan: "PRO",
        expiresAt: "2026-06-12T00:00:00Z",
        daysRemaining: -1,
        gracePeriodActive: false,
        installedAt: "2026-05-12T00:00:00Z",
        showRenewalBanner: true,
        daysUntilBlock: undefined,
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<LicenseBanner />);

    expect(screen.getByRole("button", { name: /Activar licencia/i })).toBeInTheDocument();
    expect(screen.getByText("Licencia expirada - Contacte a soporte")).toBeInTheDocument();
  });
});
