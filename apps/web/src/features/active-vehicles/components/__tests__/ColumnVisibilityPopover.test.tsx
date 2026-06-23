import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColumnVisibilityPopover } from "../ColumnVisibilityPopover";

const mockToggleColumn = vi.hoisted(() => vi.fn());
const mockResetColumns = vi.hoisted(() => vi.fn());

const mockColumns = [
  { key: "plate", label: "Placa", defaultVisible: true },
  { key: "ticketNumber", label: "Ticket", defaultVisible: true },
  { key: "rateName", label: "Tarifa", defaultVisible: false },
];

const mockVisible = new Set(["plate", "ticketNumber"]);

vi.mock("../../hooks/useColumnVisibility", () => ({
  useColumnVisibility: () => ({
    columns: mockColumns,
    visible: mockVisible,
    toggleColumn: mockToggleColumn,
    resetColumns: mockResetColumns,
  }),
}));

vi.mock("@heroui/react", () => ({
  Popover: Object.assign(({ children }: any) => <div data-testid="popover">{children}</div>, {
    Content: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
    Dialog: ({ children }: any) => <div data-testid="popover-dialog">{children}</div>,
  }),
}));

vi.mock("@/components/bridge/Button", () => ({
  Button: ({ children, isIconOnly, ...props }: any) => <button {...props}>{children}</button>,
}));

describe("ColumnVisibilityPopover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders column visibility trigger", () => {
    render(<ColumnVisibilityPopover />);

    expect(screen.getByLabelText("Columnas visibles")).toBeInTheDocument();
  });

  it("opens popover and renders column options", () => {
    render(<ColumnVisibilityPopover />);

    expect(screen.getByText("Columnas visibles")).toBeInTheDocument();
    expect(screen.getByText("Placa")).toBeInTheDocument();
    expect(screen.getByText("Ticket")).toBeInTheDocument();
    expect(screen.getByText("Tarifa")).toBeInTheDocument();
  });

  it("toggles column visibility when checkbox is clicked", async () => {
    const user = userEvent.setup();
    render(<ColumnVisibilityPopover />);

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);

    expect(mockToggleColumn).toHaveBeenCalledWith("plate");
  });

  it("applies changes via checkbox state", () => {
    render(<ColumnVisibilityPopover />);

    const plateCheckbox = screen.getByLabelText("Placa") as HTMLInputElement;
    expect(plateCheckbox.checked).toBe(true);

    const rateCheckbox = screen.getByLabelText("Tarifa") as HTMLInputElement;
    expect(rateCheckbox.checked).toBe(false);
  });

  it("resores default columns when Restaurar is clicked", async () => {
    const user = userEvent.setup();
    render(<ColumnVisibilityPopover />);

    await user.click(screen.getByText("Restaurar"));
    expect(mockResetColumns).toHaveBeenCalledTimes(1);
  });
});
