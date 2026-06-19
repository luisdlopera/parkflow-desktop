import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewCompanyPage from "../page";
import type { CreateCompanyRequest } from "@/lib/licensing/types";

const mockCreateCompany = vi.fn<(request: CreateCompanyRequest) => Promise<any>>();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/lib/licensing/hooks", () => ({
  useCreateCompany: () => ({
    createCompany: (request: CreateCompanyRequest) => mockCreateCompany(request),
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/features/admin/CompanyForm", () => ({
  CompanyForm: ({ onSubmit, isLoading }: { onSubmit: (data: CreateCompanyRequest) => Promise<void>; isLoading: boolean }) => (
    <div data-testid="company-form">
      <button
        data-testid="mock-form-submit"
        disabled={isLoading}
        onClick={async () => {
          try {
            await onSubmit({ name: "Test Company", plan: "SYNC" } as CreateCompanyRequest);
          } catch {
            // Error se propaga al CompanyForm real; aquí no hacemos nada
          }
        }}
      >
        Submit Form
      </button>
    </div>
  ),
}));

describe("NewCompanyPage", () => {
  beforeEach(() => {
    mockCreateCompany.mockClear();
    mockPush.mockClear();
  });

  it("renders the page with heading and form", () => {
    render(<NewCompanyPage />);
    expect(screen.getByText("Crear Nueva Empresa")).toBeInTheDocument();
    expect(screen.getByTestId("company-form")).toBeInTheDocument();
  });

  it("creates company and shows credential dialog before redirecting", async () => {
    const user = userEvent.setup();
    mockCreateCompany.mockResolvedValueOnce({
      id: "c1",
      name: "Test Company",
      email: "admin@test.com",
      adminPassword: "secret123",
      plan: "SYNC",
    });

    render(<NewCompanyPage />);
    await user.click(screen.getByTestId("mock-form-submit"));

    await waitFor(() => {
      expect(mockCreateCompany).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateCompany).toHaveBeenCalledWith(expect.objectContaining({ name: "Test Company", plan: "SYNC" }));

    expect(screen.getByText("Empresa Creada Exitosamente")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(screen.getByText("secret123")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ir a empresas" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin/companies");
    });
  });

  it("propagates error to CompanyForm when createCompany fails", async () => {
    const user = userEvent.setup();
    mockCreateCompany.mockRejectedValueOnce(new Error("Company already exists"));

    render(<NewCompanyPage />);
    await user.click(screen.getByTestId("mock-form-submit"));

    await waitFor(() => {
      expect(mockCreateCompany).toHaveBeenCalledTimes(1);
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows back button that navigates to companies list", async () => {
    const user = userEvent.setup();
    render(<NewCompanyPage />);

    // El botón de atrás no tiene texto; buscamos el primer button icon-only
    const backButton = screen.getByRole("button", { name: "Volver a empresas" });
    expect(backButton).toBeInTheDocument();
    await user.click(backButton);
    expect(mockPush).toHaveBeenCalledWith("/admin/companies");
  });
});
