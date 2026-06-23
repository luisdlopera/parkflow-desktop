import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntityManagementPage } from "../EntityManagementPage";
import type { DataTableColumn } from "@/components/ui/DataTable";

interface TestEntity {
  id: string;
  name: string;
  status: string;
}

const columns: DataTableColumn<TestEntity>[] = [
  { key: "name", label: "Nombre" },
  { key: "status", label: "Estado" },
];

const data: TestEntity[] = [
  { id: "1", name: "Entidad A", status: "ACTIVE" },
  { id: "2", name: "Entidad B", status: "INACTIVE" },
];

const mockOnSave = vi.hoisted(() => vi.fn());
const mockOnDelete = vi.hoisted(() => vi.fn());

function TestForm({ initialData, onSave }: { initialData?: TestEntity | null; onSave: (data: Partial<TestEntity>) => void }) {
  return (
    <div data-testid="test-form">
      <span data-testid="form-mode">{initialData ? "edit" : "create"}</span>
      <button data-testid="form-save" onClick={() => onSave({ name: "New Entity" })}>
        Save
      </button>
    </div>
  );
}

vi.mock("@/components/ui/DataTable", () => ({
  default: ({ columns, data, actions, title, isLoading, error, emptyMessage }: any) => (
    <div data-testid="data-table">
      <h2>{title}</h2>
      {isLoading && <p data-testid="loading">Loading...</p>}
      {error && <p data-testid="error">{error}</p>}
      {data.length === 0 && !isLoading && <p>{emptyMessage}</p>}
      <table>
        <thead>
          <tr>{columns.map((col: any) => <th key={col.key}>{col.label}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((item: any) => (
            <tr key={item.id}>
              {columns.map((col: any) => <td key={col.key}>{item[col.key]}</td>)}
              <td>{actions ? actions(item) : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
}));

vi.mock("@/components/ui/DialogProvider", () => ({
  useDialog: () => ({
    confirm: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock("@/components/bridge/Modal", () => ({
  Modal: Object.assign(
    ({ children, state }: any) => {
      if (!state?.isOpen) return null;
      return React.createElement("div", { "data-testid": "modal" }, children);
    },
    {
      Content: ({ children }: any) => React.createElement("div", { "data-testid": "modal-content" }, children),
      Header: ({ children }: any) => React.createElement("div", { "data-testid": "modal-header" }, children),
      Body: ({ children }: any) => React.createElement("div", { "data-testid": "modal-body" }, children),
      Footer: ({ children }: any) => React.createElement("div", { "data-testid": "modal-footer" }, children),
    },
  ),
  ModalContent: ({ children }: any) => React.createElement("div", { "data-testid": "modal-content-standalone" }, children),
  ModalHeader: ({ children }: any) => React.createElement("div", { "data-testid": "modal-header-standalone" }, children),
  ModalBody: ({ children }: any) => React.createElement("div", { "data-testid": "modal-body-standalone" }, children),
  ModalFooter: ({ children }: any) => React.createElement("div", { "data-testid": "modal-footer-standalone" }, children),
}));

vi.mock("@/components/bridge/Button", () => ({
  Button: ({ children, onPress, startContent }: any) => (
    <button onClick={onPress} data-testid="entity-button">
      {startContent}{children}
    </button>
  ),
}));

vi.mock("@/components/ui/PerformanceMonitor", () => ({
  PerformanceMonitor: () => null,
}));

vi.mock("@/components/bridge/Dropdown", () => ({
  Dropdown: ({ children }: any) => <div data-testid="dropdown">{children}</div>,
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownItem: ({ children, onPress }: any) => (
    <button data-testid="dropdown-item" onClick={onPress}>{children}</button>
  ),
  DropdownTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownSection: ({ children }: any) => <div data-testid="dropdown-section">{children}</div>,
}));

describe("EntityManagementPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders DataTable on mount", () => {
    render(
      <EntityManagementPage
        title="Empresas"
        description="Gestión de empresas registradas"
        data={data}
        columns={columns}
        getRowKey={(item) => item.id}
        isLoading={false}
      />,
    );

    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.getByText("Entidad A")).toBeInTheDocument();
    expect(screen.getByText("Entidad B")).toBeInTheDocument();
  });

  it("opens create modal when Nuevo Registro is clicked", async () => {
    const user = userEvent.setup();
    render(
      <EntityManagementPage
        title="Empresas"
        description="Gestión"
        data={data}
        columns={columns}
        getRowKey={(item) => item.id}
        FormComponent={TestForm}
        onSave={mockOnSave}
        isLoading={false}
      />,
    );

    await user.click(screen.getByText("Nuevo Registro"));
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(screen.getByTestId("form-mode")).toHaveTextContent("create");
  });

  it("opens edit modal when Editar is clicked", async () => {
    const user = userEvent.setup();
    render(
      <EntityManagementPage
        title="Empresas"
        description="Gestión"
        data={data}
        columns={columns}
        getRowKey={(item) => item.id}
        FormComponent={TestForm}
        onSave={mockOnSave}
        isLoading={false}
      />,
    );

    const editItems = screen.getAllByText("Editar");
    await user.click(editItems[0]);
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(screen.getByTestId("form-mode")).toHaveTextContent("edit");
  });

  it("calls onDelete when confirm dialog is accepted", async () => {
    const user = userEvent.setup();
    render(
      <EntityManagementPage
        title="Empresas"
        description="Gestión"
        data={data}
        columns={columns}
        getRowKey={(item) => item.id}
        onDelete={mockOnDelete}
        isLoading={false}
      />,
    );

    const deleteItems = screen.getAllByText("Eliminar");
    await user.click(deleteItems[0]);
    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith("1");
    });
  });

  it("calls onSave when form is saved in create mode", async () => {
    const user = userEvent.setup();
    render(
      <EntityManagementPage
        title="Empresas"
        description="Gestión"
        data={data}
        columns={columns}
        getRowKey={(item) => item.id}
        FormComponent={TestForm}
        onSave={mockOnSave}
        isLoading={false}
      />,
    );

    await user.click(screen.getByText("Nuevo Registro"));
    await user.click(screen.getByTestId("form-save"));
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({ name: "New Entity" }, undefined);
    });
  });

  it("calls onSave with id when form is saved in edit mode", async () => {
    const user = userEvent.setup();
    render(
      <EntityManagementPage
        title="Empresas"
        description="Gestión"
        data={data}
        columns={columns}
        getRowKey={(item) => item.id}
        FormComponent={TestForm}
        onSave={mockOnSave}
        isLoading={false}
      />,
    );

    await user.click(screen.getAllByText("Editar")[0]);
    await user.click(screen.getByTestId("form-save"));
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({ name: "New Entity" }, "1");
    });
  });
});
