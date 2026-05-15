import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CompaniesPage from "../companies/page";

const mockHooks = vi.hoisted(() => {
  const mockMutate = vi.fn();
  const mockCreateCompany = vi.fn();
  const mockUseCompanies = vi.fn();

  function makeMockCompanies(overrides: Record<string, unknown> = {}) {
    return {
      data: [
        { id: "c1", name: "Empresa Alpha", nit: "123", plan: "SYNC", status: "ACTIVE",
          maxDevices: 5, maxLocations: 3, maxUsers: 10, offlineModeAllowed: true,
          offlineLeaseHours: 48, modules: [], devices: [], createdAt: "2026-01-01T00:00:00Z" },
        { id: "c2", name: "Empresa Beta", nit: "456", plan: "PRO", status: "EXPIRED",
          expiresAt: "2025-12-01T00:00:00Z", maxDevices: 10, maxLocations: 5, maxUsers: 20,
          offlineModeAllowed: true, offlineLeaseHours: 48, modules: [], devices: [],
          createdAt: "2026-01-01T00:00:00Z" },
      ],
      isLoading: false,
      error: null,
      mutate: mockMutate,
      ...overrides,
    };
  }

  mockUseCompanies.mockReturnValue(makeMockCompanies());

  return {
    mockMutate,
    mockCreateCompany,
    mockUseCompanies,
    makeMockCompanies,
  };
});

const { mockMutate, mockCreateCompany, mockUseCompanies, makeMockCompanies } = mockHooks;

vi.mock("@/lib/licensing/hooks", () => ({
  useCompanies: mockHooks.mockUseCompanies,
  useCreateCompany: () => ({
    createCompany: mockHooks.mockCreateCompany,
    isLoading: false,
    error: null,
  }),
  translatePlan: (plan: string) =>
    ({ SYNC: "Sync / Cloud", PRO: "Pro / Multi-sede", LOCAL: "Local / Offline" })[plan] || plan,
  translateStatus: (status: string) =>
    ({ ACTIVE: "Activa", EXPIRED: "Expirada" })[status] || status,
}));

vi.mock("@/components/admin/CompanyForm", () => ({
  CompanyForm: ({ onSubmit }: { onSubmit: (data: unknown) => void }) => (
    <button data-testid="mock-company-form" onClick={() => onSubmit({ name: "Test", plan: "SYNC" })}>
      Submit Form
    </button>
  ),
}));

vi.mock("@/components/admin/GenerateLicenseDialog", () => ({
  GenerateLicenseDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="license-dialog" /> : null,
}));

vi.mock("@/components/feedback/ErrorState", () => ({
  ErrorState: ({ title, description, onRetry }: {
    title: string; description: string; onRetry: () => void
  }) => (
    <div data-testid="error-state">
      <p data-testid="error-title">{title}</p>
      <p data-testid="error-description">{description}</p>
      <button data-testid="error-retry" onClick={onRetry}>Reintentar</button>
    </div>
  ),
}));

vi.mock("@/lib/errors/get-user-error-message", () => ({
  getUserErrorMessage: () => ({
    title: "Error al cargar empresas",
    description: "No se pudieron cargar las empresas. Intente nuevamente.",
    actionLabel: "Reintentar",
  }),
}));

vi.mock("@/lib/errors/api-error", () => ({
  ApiError: class ApiError extends Error {
    code: string;
    correlationId: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
      this.correlationId = "corr-123";
    }
  },
}));

describe("CompaniesPage", () => {
  beforeEach(() => {
    mockMutate.mockReset();
    mockCreateCompany.mockReset();
    mockUseCompanies.mockReset();
    mockUseCompanies.mockReturnValue(makeMockCompanies());
  });

  it("renders the company list with correct data", () => {
    render(<CompaniesPage />);
    expect(screen.getAllByText("Empresa Alpha").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Empresa Beta").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sync / Cloud").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Pro / Multi-sede").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Activa").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Expirada").length).toBeGreaterThanOrEqual(1);
  });

  it("shows correct stats card counts", () => {
    render(<CompaniesPage />);
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
  });

  it("filters companies by search query", async () => {
    render(<CompaniesPage />);

    fireEvent.change(screen.getByPlaceholderText("Buscar por nombre, NIT o email..."), {
      target: { value: "Alpha" },
    });

    await waitFor(() => {
      expect(screen.getAllByText("Empresa Alpha").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows empty state when no companies match search", async () => {
    render(<CompaniesPage />);

    fireEvent.change(screen.getByPlaceholderText("Buscar por nombre, NIT o email..."), {
      target: { value: "ZZZNonexistent" },
    });

    await waitFor(() => {
      expect(screen.getAllByText("No se encontraron empresas").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows error state when API fails", () => {
    mockUseCompanies.mockReturnValue(makeMockCompanies({ data: null, error: new Error("API Error") }));

    render(<CompaniesPage />);
    expect(screen.getByTestId("error-state")).toBeDefined();
    expect(screen.getByTestId("error-title")).toHaveTextContent("Error al cargar empresas");
  });

  it("retries when retry button is clicked in error state", () => {
    mockUseCompanies.mockReturnValue(makeMockCompanies({ data: null, error: new Error("API Error") }));

    render(<CompaniesPage />);
    fireEvent.click(screen.getByTestId("error-retry"));
    expect(mockMutate).toHaveBeenCalled();
  });

  it("opens create company modal on button click", async () => {
    render(<CompaniesPage />);

    fireEvent.click(screen.getByText("Nueva Empresa"));

    await waitFor(() => {
      expect(screen.getByTestId("mock-company-form")).toBeDefined();
    });
  });
});
