import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import NuevoIngresoPage from "../page";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue(null),
  }),
  usePathname: () => "",
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), replace: vi.fn() }),

}));

vi.mock("@/lib/services/auth-domain.service", () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/features/cash-register/hooks/useTerminalCaja", () => ({
  useTerminalCaja: vi.fn().mockReturnValue({
    caja: { status: "open", reason: null },
    requireOpenForPayment: true,
  }),
}));

vi.mock("@/components/forms/VehicleEntryFormV2", () => ({
  default: ({
    initialPlate,
    disableRecovery,
  }: {
    initialPlate?: string;
    disableRecovery?: boolean;
  }) => (
    <div data-testid="vehicle-entry-form">
      <span data-testid="initial-plate">{initialPlate ?? ""}</span>
      <span data-testid="disable-recovery">{String(disableRecovery ?? false)}</span>
      <input data-testid="plate-input" placeholder="Placa" />
      <select data-testid="vehicle-type-select">
        <option>Carro</option>
        <option>Moto</option>
      </select>
      <button data-testid="submit-button">Registrar Ingreso</button>
    </div>
  ),
}));

describe("NuevoIngresoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders vehicle entry form when user has permission", async () => {
    render(<NuevoIngresoPage />);
    await waitFor(() => {
      expect(screen.getByTestId("vehicle-entry-form")).toBeInTheDocument();
    });
  });

  it("renders plate input field inside the form", async () => {
    render(<NuevoIngresoPage />);
    await waitFor(() => {
      expect(screen.getByTestId("plate-input")).toBeInTheDocument();
    });
  });

  it("renders vehicle type selector inside the form", async () => {
    render(<NuevoIngresoPage />);
    await waitFor(() => {
      expect(screen.getByTestId("vehicle-type-select")).toBeInTheDocument();
    });
  });

  it("renders submit button inside the form", async () => {
    render(<NuevoIngresoPage />);
    await waitFor(() => {
      expect(screen.getByTestId("submit-button")).toBeInTheDocument();
    });
  });

  it("shows access denied when user lacks permission", async () => {
    const { hasPermission } = await import("@/lib/services/auth-domain.service");
    vi.mocked(hasPermission).mockResolvedValue(false);
    render(<NuevoIngresoPage />);
    await waitFor(() => {
      expect(screen.getByText("Acceso denegado")).toBeInTheDocument();
    });
  });

  it("forwards initialPlate from search params", async () => {
    const { useSearchParams } = await import("next/navigation");
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn((key) => (key === "plate" ? "abc123" : null)),
    } as any);
    render(<NuevoIngresoPage />);
    await waitFor(() => {
      expect(screen.getByTestId("initial-plate").textContent).toBe("ABC123");
    });
  });
});
