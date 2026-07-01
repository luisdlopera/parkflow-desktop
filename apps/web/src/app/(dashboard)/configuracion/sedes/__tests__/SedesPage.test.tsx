import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import SedesPage from "../page";

vi.mock("next/navigation", () => ({
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
  useRouter: vi.fn(),
}));

vi.mock("@/lib/settings-api", () => ({
  fetchConfigurationSites: vi.fn().mockResolvedValue({
    content: [
      { id: "site-1", code: "SJ", name: "San José", city: "Bogotá", currency: "COP", maxCapacity: 50, isActive: true },
      { id: "site-2", code: "CC", name: "Centro Comercial", city: "Medellín", currency: "COP", maxCapacity: 100, isActive: true },
    ],
  }),
  createConfigurationSite: vi.fn().mockResolvedValue({ id: "site-new" }),
  updateConfigurationSite: vi.fn().mockResolvedValue({ id: "site-1" }),
  patchConfigurationSiteStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/licensing/api", () => ({
  listCompanies: vi.fn().mockResolvedValue([
    { id: "company-1", name: "Empresa Demo", status: "ACTIVE" },
  ]),
}));

const defaultCrud = {
  rows: [
    { id: "site-1", code: "SJ", name: "San José", city: "Bogotá", currency: "COP", maxCapacity: 50, isActive: true },
    { id: "site-2", code: "CC", name: "Centro Comercial", city: "Medellín", currency: "COP", maxCapacity: 100, isActive: true },
  ],
  loading: false,
  error: null,
  drawerOpen: false,
  editing: null,
  openCreate: vi.fn(),
  openEdit: vi.fn(),
  closeDrawer: vi.fn(),
  load: vi.fn().mockResolvedValue(undefined),
  save: vi.fn().mockResolvedValue(true),
  handleToggleStatus: vi.fn(),
};

vi.mock("@/hooks/core/useConfigCrud", () => ({
  useConfigCrud: vi.fn(() => defaultCrud),
}));

vi.mock("@/components/settings/DataTableSection", () => ({
  DataTableSection: ({
    title,
    columns,
    rows,
    loading,
    onCreate,
    emptyMessage,
  }: any) => (
    <div data-testid="data-table-section">
      <h3>{title}</h3>
      {loading ? (
        <span>Cargando...</span>
      ) : rows.length === 0 ? (
        <span>{emptyMessage}</span>
      ) : (
        <table data-testid="sites-table">
          <thead>
            <tr>
              {columns.map((col: any) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => (
              <tr key={row.id} data-testid={`site-row-${row.id}`}>
                <td>{row.code}</td>
                <td>{row.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button data-testid="create-button" onClick={onCreate}>
        Nueva Sede
      </button>
    </div>
  ),
}));

vi.mock("@/components/ui/FormDrawer", () => ({
  FormDrawer: ({ open, title, children, onSubmit }: any) =>
    open ? (
      <div data-testid="form-drawer">
        <h4>{title}</h4>
        <form onSubmit={onSubmit}>
          {children}
          <button type="submit">Guardar</button>
        </form>
      </div>
    ) : null,
}));

vi.mock("@/features/configuration/components/ui/ConfigPageHeader", () => ({
  ConfigPageHeader: ({ title }: { title: string }) => (
    <div data-testid="config-page-header">{title}</div>
  ),
}));

import { useConfigCrud } from "@/hooks/core/useConfigCrud";

describe("SedesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useConfigCrud).mockReturnValue(defaultCrud);
  });

  it("renders the config page header", async () => {
    render(<SedesPage />);
    await waitFor(() => {
      expect(screen.getByTestId("config-page-header")).toBeInTheDocument();
    });
  });

  it("renders DataTableSection with site rows", async () => {
    render(<SedesPage />);
    await waitFor(() => {
      expect(screen.getByTestId("data-table-section")).toBeInTheDocument();
      expect(screen.getByTestId("sites-table")).toBeInTheDocument();
      expect(screen.getByText("San José")).toBeInTheDocument();
      expect(screen.getByText("Centro Comercial")).toBeInTheDocument();
    });
  });

  it("renders create button", async () => {
    render(<SedesPage />);
    await waitFor(() => {
      expect(screen.getByTestId("create-button")).toBeInTheDocument();
    });
  });

  it("opens form drawer when create button is clicked", async () => {
    render(<SedesPage />);
    const createButton = screen.getByTestId("create-button");
    fireEvent.click(createButton);
    expect(defaultCrud.openCreate).toHaveBeenCalled();
  });

  it("shows FormDrawer when drawerOpen is true", () => {
    vi.mocked(useConfigCrud).mockReturnValue({
      ...defaultCrud,
      drawerOpen: true,
    });
    render(<SedesPage />);
    expect(screen.getByTestId("form-drawer")).toBeInTheDocument();
    const drawerTitles = screen.getAllByText("Nueva Sede");
    expect(drawerTitles.length).toBeGreaterThanOrEqual(1);
  });

  it("shows FormDrawer with edit title when editing", () => {
    vi.mocked(useConfigCrud).mockReturnValue({
      ...defaultCrud,
      drawerOpen: true,
      editing: { id: "site-1" },
    });
    render(<SedesPage />);
    expect(screen.getByText("Editar Sede")).toBeInTheDocument();
  });
});
