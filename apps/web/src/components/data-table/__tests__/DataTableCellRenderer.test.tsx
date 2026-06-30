import React from "react";
import { render, screen } from "@testing-library/react";
import { DataTableCellRenderer } from "../DataTableCellRenderer";
import { DataTableColumn } from "../types";

describe("DataTableCellRenderer", () => {
  const mockRow = { id: "1", name: "Test", status: "ACTIVE", price: 50000 };

  it("renders text by default when no type or format is specified", () => {
    const column: DataTableColumn = { key: "name", label: "Nombre" };
    render(<DataTableCellRenderer column={column} value="Hello" row={mockRow} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders fallback dash for null values", () => {
    const column: DataTableColumn = { key: "name", label: "Nombre" };
    render(<DataTableCellRenderer column={column} value={null} row={mockRow} />);
    expect(screen.getByText("−")).toBeInTheDocument();
  });

  it("renders fallback dash for undefined values", () => {
    const column: DataTableColumn = { key: "name", label: "Nombre" };
    render(<DataTableCellRenderer column={column} value={undefined} row={mockRow} />);
    expect(screen.getByText("−")).toBeInTheDocument();
  });

  it("renders fallback dash for empty string values", () => {
    const column: DataTableColumn = { key: "name", label: "Nombre" };
    render(<DataTableCellRenderer column={column} value="" row={mockRow} />);
    expect(screen.getByText("−")).toBeInTheDocument();
  });

  it("renders currency with COP symbol", () => {
    const column: DataTableColumn = { key: "price", label: "Precio", type: "currency" };
    render(<DataTableCellRenderer column={column} value={50000} row={mockRow} />);
    expect(screen.getByText(/\$50,?000/)).toBeInTheDocument();
  });

  it("renders datetime in Spanish format", () => {
    const column: DataTableColumn = { key: "createdAt", label: "Fecha", type: "datetime" };
    const date = new Date("2024-06-15T10:30:00");
    render(<DataTableCellRenderer column={column} value={date.toISOString()} row={mockRow} />);
    // Should contain year 2024
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it("renders boolean as Sí chip", () => {
    const column: DataTableColumn = { key: "isActive", label: "Activo", type: "boolean" };
    render(<DataTableCellRenderer column={column} value={true} row={mockRow} />);
    expect(screen.getByText("Sí")).toBeInTheDocument();
  });

  it("renders boolean as No chip", () => {
    const column: DataTableColumn = { key: "isActive", label: "Activo", type: "boolean" };
    render(<DataTableCellRenderer column={column} value={false} row={mockRow} />);
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("renders status with default color mapping", () => {
    const column: DataTableColumn = {
      key: "status",
      label: "Estado",
      type: "status",
      options: {
        labelMap: { ACTIVE: "Activo" },
        colorMap: { ACTIVE: "success" },
      },
    };
    render(<DataTableCellRenderer column={column} value="ACTIVE" row={mockRow} />);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("renders formatEnum with label map", () => {
    const column: DataTableColumn = {
      key: "vehicleType",
      label: "Tipo",
      type: "formatEnum",
      options: {
        labelMap: { CAR: "Carro" },
      },
    };
    render(<DataTableCellRenderer column={column} value="CAR" row={mockRow} />);
    expect(screen.getByText("Carro")).toBeInTheDocument();
  });

  it("renders tags as chips", () => {
    const column: DataTableColumn = {
      key: "tags",
      label: "Tags",
      type: "tags",
    };
    render(<DataTableCellRenderer column={column} value={["urgent", "new"]} row={mockRow} />);
    expect(screen.getByText("urgent")).toBeInTheDocument();
    expect(screen.getByText("new")).toBeInTheDocument();
  });

  it("renders json as preformatted text", () => {
    const column: DataTableColumn = {
      key: "metadata",
      label: "Metadata",
      type: "json",
    };
    render(<DataTableCellRenderer column={column} value='{"key": "value"}' row={mockRow} />);
    expect(screen.getByText(/"key"/)).toBeInTheDocument();
  });

  it("renders copyable with copy button", () => {
    const column: DataTableColumn = {
      key: "plate",
      label: "Placa",
      type: "copyable",
    };
    render(<DataTableCellRenderer column={column} value="ABC123" row={mockRow} />);
    expect(screen.getByText("ABC123")).toBeInTheDocument();
    // Should have a copy button (aria-label)
    expect(screen.getByRole("button", { name: /copiar/i })).toBeInTheDocument();
  });

  it("renders custom cell with render function", () => {
    const column: DataTableColumn = {
      key: "customField",
      label: "Custom",
      type: "custom",
      options: {
        render: (value: any) => <span data-testid="custom">{value.toUpperCase()}</span>,
      },
    };
    render(<DataTableCellRenderer column={column} value="test" row={mockRow} />);
    expect(screen.getByTestId("custom")).toHaveTextContent("TEST");
  });

  it("maps legacy format to type for backward compatibility", () => {
    const column: DataTableColumn = {
      key: "price",
      label: "Precio",
      format: "currency",
    };
    render(<DataTableCellRenderer column={column} value={100000} row={mockRow} />);
    expect(screen.getByText(/\$100,?000/)).toBeInTheDocument();
  });
});
