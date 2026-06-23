import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DataTable from "../DataTable";

const mockColumns = [
  { key: "name", label: "Name", sortable: true },
  { key: "age", label: "Age", sortable: true, sortType: "number" as const },
  { key: "role", label: "Role" },
];

const mockData = [
  { id: "1", name: "Alice", age: 30, role: "Admin" },
  { id: "2", name: "Bob", age: 25, role: "User" },
  { id: "3", name: "Charlie", age: 35, role: "Editor" },
];

describe("DataTable", () => {
  it("renders column headers", () => {
    render(<DataTable columns={mockColumns} data={mockData} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
  });

  it("renders data rows", () => {
    render(<DataTable columns={mockColumns} data={mockData} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("shows empty state when no data", () => {
    render(<DataTable columns={mockColumns} data={[]} />);
    expect(screen.getByText("No hay datos disponibles")).toBeInTheDocument();
  });

  it("shows custom empty message", () => {
    render(
      <DataTable columns={mockColumns} data={[]} emptyMessage="Custom empty" />
    );
    expect(screen.getByText("Custom empty")).toBeInTheDocument();
  });

  it("shows loading skeleton when loading", () => {
    const { container } = render(
      <DataTable columns={mockColumns} data={[]} isLoading />
    );
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it("calls onPaginationChange when pagination control is clicked", async () => {
    const onPaginationChange = vi.fn();
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        pagination={{ page: 1, pageSize: 2, total: 3 }}
        onPaginationChange={onPaginationChange}
      />
    );
    const nextBtn = screen.getByText("Siguiente");
    await userEvent.click(nextBtn);
    expect(onPaginationChange).toHaveBeenCalledWith(2, 2);
  });

  it("renders custom cell content via render function", () => {
    const columnsWithRender = [
      ...mockColumns,
      {
        key: "actions",
        label: "Actions",
        render: (row: { id: string }) => (
          <button>Edit {row.id}</button>
        ),
      },
    ];
    render(
      <DataTable columns={columnsWithRender} data={mockData} />
    );
    expect(screen.getByText("Edit 1")).toBeInTheDocument();
    expect(screen.getByText("Edit 2")).toBeInTheDocument();
    expect(screen.getByText("Edit 3")).toBeInTheDocument();
  });
});
