import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminHeader } from "../AdminHeader";

const mockOnMenuClick = vi.hoisted(() => vi.fn());

vi.mock("@/components/theme/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));

vi.mock("@/components/auth/UserMenu", () => ({
  UserMenu: () => <div data-testid="user-menu">UserMenu</div>,
}));

describe("AdminHeader", () => {
  it("renders header title", () => {
    render(<AdminHeader onMenuClick={mockOnMenuClick} />);

    expect(screen.getByText("Panel de Administración")).toBeInTheDocument();
    expect(screen.getByText("ParkFlow Admin")).toBeInTheDocument();
  });

  it("renders user menu", () => {
    render(<AdminHeader onMenuClick={mockOnMenuClick} />);

    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
  });

  it("renders theme toggle", () => {
    render(<AdminHeader onMenuClick={mockOnMenuClick} />);

    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("renders navigation badges/links", () => {
    render(<AdminHeader onMenuClick={mockOnMenuClick} />);

    expect(screen.getByText("Super Admin")).toBeInTheDocument();
  });

  it("calls onMenuClick when mobile menu button is clicked", async () => {
    const user = userEvent.setup();
    render(<AdminHeader onMenuClick={mockOnMenuClick} />);

    const menuButton = screen.getByLabelText("Abrir menú");
    await user.click(menuButton);

    expect(mockOnMenuClick).toHaveBeenCalledTimes(1);
  });
});
