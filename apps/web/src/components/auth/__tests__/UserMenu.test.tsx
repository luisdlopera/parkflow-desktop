import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserMenu } from "../UserMenu";
import React from "react";

const mockPush = vi.fn();
const mockCurrentUser = vi.fn();
const mockClearSession = vi.fn();
const mockLogoutAll = vi.fn();

// Override the global Dropdown mock so onPress works on items
vi.mock("@/components/bridge/Dropdown", () => ({
  Dropdown: ({ children }: any) => <div>{children}</div>,
  DropdownTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownItem: ({ children, onPress, ...props }: any) => (
    <button onClick={onPress} type="button" {...props}>{children}</button>
  ),
  DropdownSection: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/services/auth-domain.service", () => ({
  currentUser: (...args: any[]) => mockCurrentUser(...args),
  canAccessSuperAdminPortal: (user: any) => user?.role === "SUPER_ADMIN",
}));

vi.mock("@/features/auth/api/auth.api", () => ({
  logoutAllSessions: (...args: any[]) => mockLogoutAll(...args),
}));

vi.mock("@/lib/services/auth-storage.service", () => ({
  clearSession: (...args: any[]) => mockClearSession(...args),
}));

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows fallback avatar when no user", () => {
    mockCurrentUser.mockResolvedValue(null);
    const { container } = render(<UserMenu />);
    const avatarSpan = container.querySelector('[name="?"]');
    expect(avatarSpan).toBeInTheDocument();
  });

  it("shows user name and role when authenticated", async () => {
    mockCurrentUser.mockResolvedValue({
      id: "1",
      name: "Juan Pérez",
      email: "juan@test.com",
      role: "ADMIN",
      permissions: [],
    });
    render(<UserMenu />);
    await waitFor(() => {
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
      expect(screen.getByText("Administrador")).toBeInTheDocument();
    });
  });

  it("shows super admin panel option for super admin", async () => {
    mockCurrentUser.mockResolvedValue({
      id: "1",
      name: "Admin",
      email: "admin@test.com",
      role: "SUPER_ADMIN",
      permissions: [],
    });
    render(<UserMenu />);
    await waitFor(() => {
      expect(screen.getByText("Panel Super Admin")).toBeInTheDocument();
    });
  });

  it("does not show admin option for regular admin", async () => {
    mockCurrentUser.mockResolvedValue({
      id: "1",
      name: "Admin",
      email: "admin@test.com",
      role: "ADMIN",
      permissions: [],
    });
    render(<UserMenu />);
    await waitFor(() => {
      expect(screen.queryByText("Panel Super Admin")).not.toBeInTheDocument();
    });
  });

  it("calls clearSession and redirects on logout", async () => {
    mockCurrentUser.mockResolvedValue({
      id: "1",
      name: "Test",
      email: "test@test.com",
      role: "ADMIN",
      permissions: [],
    });
    mockClearSession.mockResolvedValue(undefined);
    render(<UserMenu />);
    await waitFor(() => {
      expect(screen.getByText("Test")).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole("button");
    const logoutBtn = buttons.find((b) => b.textContent?.includes("Cerrar sesión") && !b.textContent?.includes("todas"));
    expect(logoutBtn).toBeDefined();
    if (logoutBtn) {
      await userEvent.click(logoutBtn);
    }
    await waitFor(() => {
      expect(mockClearSession).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
