import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClientPage from "../ClientPage";
import type { Company } from "@/lib/licensing/types";

const mockPush = vi.fn();
const mockGetCompany = vi.fn<(id: string) => Promise<Company>>();
const mockUpdateCompany = vi.fn<(id: string, data: any) => Promise<Company>>();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams({ id: "c1" }),
}));

vi.mock("@/lib/licensing/api", () => ({
  getCompany: (id: string) => mockGetCompany(id),
  updateCompany: (id: string, data: any) => mockUpdateCompany(id, data),
}));

vi.mock("@/features/admin/CompanyForm", () => ({
  CompanyForm: ({ onSubmit, isLoading, initialData }: { onSubmit: (data: any) => Promise<void>; isLoading: boolean; initialData?: any }) => (
    <div data-testid="company-form">
      <div data-testid="initial-data">{initialData ? initialData.name : "no-data"}</div>
      <button
        data-testid="mock-form-submit"
        disabled={isLoading}
        onClick={async () => {
          try {
            await onSubmit({ name: "Updated Company", plan: "PRO" });
          } catch {
            // Error se propaga al formulario real; aquí no hacemos nada
          }
        }}
      >
        Submit Form
      </button>
    </div>
  ),
}));

describe("ClientPage (Edit Company)", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockGetCompany.mockClear();
    mockUpdateCompany.mockClear();
  });

  it("fetches and displays company data for editing", async () => {
    const company: Company = {
      id: "c1",
      name: "Empresa Alpha",
      nit: "123",
      email: "a@b.com",
      phone: "300",
      city: "Bogotá",
      contactName: "Juan",
      address: "Calle 1",
      plan: "PRO",
      status: "ACTIVE",
      maxDevices: 10,
      maxLocations: 5,
      maxUsers: 20,
      trialDays: 30,
      offlineModeAllowed: false,
      offlineLeaseHours: 48,
      modules: [],
      devices: [],
      createdAt: "2026-01-01T00:00:00Z",
    };
    mockGetCompany.mockResolvedValueOnce(company);

    render(<ClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId("initial-data")).toHaveTextContent("Empresa Alpha");
    });
    expect(mockGetCompany).toHaveBeenCalledWith("c1");
  });

  it("calls updateCompany and redirects on success", async () => {
    const user = userEvent.setup();
    const company: Company = {
      id: "c1",
      name: "Empresa Alpha",
      nit: "123",
      email: "a@b.com",
      phone: "300",
      city: "Bogotá",
      contactName: "Juan",
      address: "Calle 1",
      plan: "PRO",
      status: "ACTIVE",
      maxDevices: 10,
      maxLocations: 5,
      maxUsers: 20,
      trialDays: 30,
      offlineModeAllowed: false,
      offlineLeaseHours: 48,
      modules: [],
      devices: [],
      createdAt: "2026-01-01T00:00:00Z",
    };
    mockGetCompany.mockResolvedValueOnce(company);
    mockUpdateCompany.mockResolvedValueOnce(company);

    render(<ClientPage />);
    await waitFor(() => {
      expect(screen.getByTestId("company-form")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("mock-form-submit"));

    await waitFor(() => {
      expect(mockUpdateCompany).toHaveBeenCalledTimes(1);
    });
    expect(mockUpdateCompany).toHaveBeenCalledWith("c1", { name: "Updated Company", plan: "PRO" });
    expect(mockPush).toHaveBeenCalledWith("/admin/companies");
  });

  it("shows error when company not found", async () => {
    mockGetCompany.mockRejectedValueOnce(new Error("Company not found"));

    render(<ClientPage />);

    await waitFor(() => {
      expect(screen.getByText(/Empresa no encontrada/i)).toBeInTheDocument();
    });
  });

  it("shows error when update fails", async () => {
    const user = userEvent.setup();
    const company: Company = {
      id: "c1",
      name: "Empresa Alpha",
      nit: "123",
      email: "a@b.com",
      phone: "300",
      city: "Bogotá",
      contactName: "Juan",
      address: "Calle 1",
      plan: "PRO",
      status: "ACTIVE",
      maxDevices: 10,
      maxLocations: 5,
      maxUsers: 20,
      trialDays: 30,
      offlineModeAllowed: false,
      offlineLeaseHours: 48,
      modules: [],
      devices: [],
      createdAt: "2026-01-01T00:00:00Z",
    };
    mockGetCompany.mockResolvedValueOnce(company);
    mockUpdateCompany.mockRejectedValueOnce(new Error("Update failed"));

    render(<ClientPage />);
    await waitFor(() => {
      expect(screen.getByTestId("company-form")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("mock-form-submit"));

    await waitFor(() => {
      expect(mockUpdateCompany).toHaveBeenCalledTimes(1);
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
