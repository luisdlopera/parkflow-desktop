import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AuditPage from "../page";

vi.mock("@/components/bridge/Button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@heroui/react", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    Table: ({ children, ...props }: any) => <div data-testid="mock-table" {...props}>{children}</div>,
    TableHeader: ({ children }: any) => <div data-testid="mock-table-header">{children}</div>,
    TableColumn: ({ children }: any) => <div data-testid="mock-table-column">{children}</div>,
    TableBody: ({ children }: any) => <div data-testid="mock-table-body">{children}</div>,
    TableRow: ({ children }: any) => <div data-testid="mock-table-row">{children}</div>,
    TableCell: ({ children }: any) => <div data-testid="mock-table-cell">{children}</div>,
    Chip: ({ children }: any) => <span data-testid="mock-chip">{children}</span>,
    Input: ({ children, placeholder, ...props }: any) => <input placeholder={placeholder} {...props} />,
  };
});

describe("AuditPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page title", () => {
    render(<AuditPage />);
    expect(screen.getByText("Auditoría del Sistema")).toBeInTheDocument();
  });

  it("renders the search input", () => {
    render(<AuditPage />);
    expect(screen.getByPlaceholderText("Buscar por usuario o módulo...")).toBeInTheDocument();
  });

  it("renders the Exportar PDF button", () => {
    render(<AuditPage />);
    expect(screen.getByText("Exportar PDF")).toBeInTheDocument();
  });

  it("renders the audit log table with headers", () => {
    render(<AuditPage />);
    expect(screen.getByText("FECHA Y HORA")).toBeInTheDocument();
    expect(screen.getByText("USUARIO")).toBeInTheDocument();
    expect(screen.getByText("MÓDULO")).toBeInTheDocument();
    expect(screen.getByText("ACCIÓN")).toBeInTheDocument();
    expect(screen.getByText("ESTADO")).toBeInTheDocument();
    expect(screen.getByText("ACCIONES")).toBeInTheDocument();
  });

  it("renders audit log rows with data", () => {
    render(<AuditPage />);
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("cajero_1")).toBeInTheDocument();
    expect(screen.getByText("Caja")).toBeInTheDocument();
    expect(screen.getByText("Tarifas")).toBeInTheDocument();
  });

  it("renders status chips with EXITOSA label", () => {
    render(<AuditPage />);
    const statuses = screen.getAllByText("EXITOSA");
    expect(statuses).toHaveLength(2);
  });
});
