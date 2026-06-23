import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";
import { ConfigSection } from "../ui/ConfigSection";

interface TestRow {
  id: string;
  name: string;
  isActive: boolean;
}

const mockRows: TestRow[] = [
  { id: "row-1", name: "Item 1", isActive: true },
  { id: "row-2", name: "Item 2", isActive: false },
];

const mockLoadFn = vi.hoisted(() => vi.fn());
const mockCreateFn = vi.hoisted(() => vi.fn());
const mockUpdateFn = vi.hoisted(() => vi.fn());
const mockDeleteFn = vi.hoisted(() => vi.fn());
const mockToggleStatusFn = vi.hoisted(() => vi.fn());

vi.mock("@/components/settings/DataTableSection", () => ({
  DataTableSection: ({ title, rows, onCreate, createLabel, actions }: any) => (
    <div data-testid="data-table-section">
      <h2>{title}</h2>
      {rows.map((row: any) => (
        <div key={row.id} data-testid={`row-${row.id}`}>
          {actions && actions(row)}
        </div>
      ))}
      {onCreate && (
        <button data-testid="btn-create" onClick={onCreate}>
          {createLabel}
        </button>
      )}
    </div>
  ),
}));

vi.mock("@/components/ui/FormDrawer", () => ({
  FormDrawer: ({ open, title, onClose, onSubmit, children }: any) =>
    open ? (
      <div data-testid="form-drawer">
        <h3>{title}</h3>
        {children}
        <button data-testid="btn-submit" onClick={onSubmit}>Guardar</button>
        <button data-testid="btn-cancel" onClick={onClose}>Cancelar</button>
      </div>
    ) : null,
}));

vi.mock("@/components/settings/StatusToggle", () => ({
  StatusToggle: ({ active, onChange }: any) => (
    <button data-testid="status-toggle" onClick={() => onChange(!active)}>
      {active ? "Active" : "Inactive"}
    </button>
  ),
}));

describe("ConfigSection", () => {
  const schema = z.object({ name: z.string().min(1, "Requerido") });
  const defaultValues = { name: "" };

  const formFields = (form: any) => (
    <input
      data-testid="input-name"
      {...form.register("name")}
    />
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadFn.mockResolvedValue({ content: mockRows, totalElements: 2, totalPages: 1, page: 0, size: 20 });
    mockCreateFn.mockResolvedValue({});
    mockUpdateFn.mockResolvedValue({});
    mockDeleteFn.mockResolvedValue({});
    mockToggleStatusFn.mockResolvedValue({});
  });

  it("renders section header", async () => {
    render(
      <ConfigSection
        title="Sección de prueba"
        columns={[{ key: "name", label: "Nombre" }]}
        schema={schema}
        defaultValues={defaultValues}
        loadFn={mockLoadFn}
        formFields={formFields}
      />,
    );

    expect(screen.getByText("Sección de prueba")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockLoadFn).toHaveBeenCalled();
    });
  });

  it("loads data on mount", async () => {
    render(
      <ConfigSection
        title="Sección de prueba"
        columns={[{ key: "name", label: "Nombre" }]}
        schema={schema}
        defaultValues={defaultValues}
        loadFn={mockLoadFn}
        formFields={formFields}
      />,
    );

    await waitFor(() => {
      expect(mockLoadFn).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId("row-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("row-row-2")).toBeInTheDocument();
  });

  it("opens create drawer when Nuevo is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ConfigSection
        title="Sección de prueba"
        columns={[{ key: "name", label: "Nombre" }]}
        schema={schema}
        defaultValues={defaultValues}
        loadFn={mockLoadFn}
        createFn={mockCreateFn}
        formFields={formFields}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("btn-create")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("btn-create"));
    expect(screen.getByTestId("form-drawer")).toBeInTheDocument();
    expect(screen.getByText("Nuevo Sección de prueba")).toBeInTheDocument();
  });

  it("creates a new record on submit", async () => {
    const user = userEvent.setup();
    render(
      <ConfigSection
        title="Sección de prueba"
        columns={[{ key: "name", label: "Nombre" }]}
        schema={schema}
        defaultValues={defaultValues}
        loadFn={mockLoadFn}
        createFn={mockCreateFn}
        formFields={formFields}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("btn-create")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("btn-create"));
    await user.type(screen.getByTestId("input-name"), "Nuevo item");
    await user.click(screen.getByTestId("btn-submit"));

    await waitFor(() => {
      expect(mockCreateFn).toHaveBeenCalledWith(expect.objectContaining({ name: "Nuevo item" }));
    });
  });

  it("opens edit drawer when Editar is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ConfigSection
        title="Sección de prueba"
        columns={[{ key: "name", label: "Nombre" }]}
        schema={schema}
        defaultValues={defaultValues}
        loadFn={mockLoadFn}
        updateFn={mockUpdateFn}
        formFields={formFields}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Editar").length).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByText("Editar")[0]);
    expect(screen.getByTestId("form-drawer")).toBeInTheDocument();
    expect(screen.getByText("Editar Sección de prueba")).toBeInTheDocument();
  });

  it("updates a record on edit submit", async () => {
    const user = userEvent.setup();
    render(
      <ConfigSection
        title="Sección de prueba"
        columns={[{ key: "name", label: "Nombre" }]}
        schema={schema}
        defaultValues={defaultValues}
        loadFn={mockLoadFn}
        updateFn={mockUpdateFn}
        formFields={formFields}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Editar").length).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByText("Editar")[0]);
    await user.clear(screen.getByTestId("input-name"));
    await user.type(screen.getByTestId("input-name"), "Item actualizado");
    await user.click(screen.getByTestId("btn-submit"));

    await waitFor(() => {
      expect(mockUpdateFn).toHaveBeenCalledWith("row-1", expect.objectContaining({ name: "Item actualizado" }));
    });
  });

  it("calls delete function when Eliminar is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ConfigSection
        title="Sección de prueba"
        columns={[{ key: "name", label: "Nombre" }]}
        schema={schema}
        defaultValues={defaultValues}
        loadFn={mockLoadFn}
        deleteFn={mockDeleteFn}
        formFields={formFields}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Eliminar").length).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByText("Eliminar")[0]);
    await waitFor(() => {
      expect(mockDeleteFn).toHaveBeenCalledWith("row-1");
    });
  });

  it("toggles status when status toggle is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ConfigSection
        title="Sección de prueba"
        columns={[{ key: "name", label: "Nombre" }]}
        schema={schema}
        defaultValues={defaultValues}
        loadFn={mockLoadFn}
        toggleStatusFn={mockToggleStatusFn}
        formFields={formFields}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("status-toggle").length).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByTestId("status-toggle")[0]);
    await waitFor(() => {
      expect(mockToggleStatusFn).toHaveBeenCalledWith("row-1", false);
    });
  });
});
