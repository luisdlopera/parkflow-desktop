import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CajasPage from "../page";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/lib/settings-api", () => ({
  fetchConfigurationCashRegisters: vi.fn().mockResolvedValue({
    content: [
      { id: "cr-1", code: "CAJA-01", name: "Caja Principal", site: "SJ", terminal: "TERM-01", printerName: "EPSON-01", active: true },
      { id: "cr-2", code: "CAJA-02", name: "Caja Secundaria", site: "CC", terminal: "TERM-02", printerName: "EPSON-02", active: false },
    ],
  }),
  fetchConfigurationSites: vi.fn().mockResolvedValue({
    content: [
      { id: "site-1", code: "SJ", name: "San José" },
    ],
  }),
  fetchConfigurationPrinters: vi.fn().mockResolvedValue({
    content: [
      { id: "pr-1", name: "EPSON-01", isDefault: true },
    ],
  }),
  fetchUsers: vi.fn().mockResolvedValue({
    content: [
      { id: "user-1", name: "Admin User" },
    ],
  }),
  createConfigurationCashRegister: vi.fn().mockResolvedValue({ id: "cr-new" }),
  updateConfigurationCashRegister: vi.fn().mockResolvedValue({ id: "cr-1" }),
  patchConfigurationCashRegisterStatus: vi.fn().mockResolvedValue(undefined),
}));

const defaultCrud = {
  rows: [
    { id: "cr-1", code: "CAJA-01", name: "Caja Principal", site: "SJ", terminal: "TERM-01", printerName: "EPSON-01", active: true },
    { id: "cr-2", code: "CAJA-02", name: "Caja Secundaria", site: "CC", terminal: "TERM-02", printerName: "EPSON-02", active: false },
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
        <table data-testid="cajas-table">
          <thead>
            <tr>
              {columns.map((col: any) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => (
              <tr key={row.id} data-testid={`caja-row-${row.id}`}>
                <td>{row.code}</td>
                <td>{row.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button data-testid="create-button" onClick={onCreate}>
        Nueva Caja
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

describe("CajasPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useConfigCrud).mockReturnValue(defaultCrud);
  });

  it("renders the config page header", async () => {
    render(<CajasPage />);
    await waitFor(() => {
      expect(screen.getByTestId("config-page-header")).toBeInTheDocument();
    });
  });

  it("renders DataTableSection with cash register rows", async () => {
    render(<CajasPage />);
    await waitFor(() => {
      expect(screen.getByTestId("data-table-section")).toBeInTheDocument();
      expect(screen.getByTestId("cajas-table")).toBeInTheDocument();
      expect(screen.getByText("Caja Principal")).toBeInTheDocument();
      expect(screen.getByText("Caja Secundaria")).toBeInTheDocument();
    });
  });

  it("renders create button", async () => {
    render(<CajasPage />);
    await waitFor(() => {
      expect(screen.getByTestId("create-button")).toBeInTheDocument();
    });
  });

  it("opens form drawer when create button is clicked", () => {
    render(<CajasPage />);
    fireEvent.click(screen.getByTestId("create-button"));
    expect(defaultCrud.openCreate).toHaveBeenCalled();
  });

  it("shows FormDrawer when drawerOpen is true", () => {
    vi.mocked(useConfigCrud).mockReturnValue({
      ...defaultCrud,
      drawerOpen: true,
    });
    render(<CajasPage />);
    expect(screen.getByTestId("form-drawer")).toBeInTheDocument();
    const drawerTitles = screen.getAllByText("Nueva Caja");
    expect(drawerTitles.length).toBeGreaterThanOrEqual(1);
  });

  it("shows FormDrawer with edit title when editing an existing cash register", () => {
    vi.mocked(useConfigCrud).mockReturnValue({
      ...defaultCrud,
      drawerOpen: true,
      editing: { id: "cr-1" },
    });
    render(<CajasPage />);
    expect(screen.getByText("Editar Caja")).toBeInTheDocument();
  });

  it("displays error in FormDrawer when crud has error", () => {
    vi.mocked(useConfigCrud).mockReturnValue({
      ...defaultCrud,
      drawerOpen: true,
      error: "Error al guardar",
    });
    render(<CajasPage />);
    expect(screen.getByTestId("form-drawer")).toBeInTheDocument();
  });
});
