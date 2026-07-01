import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { UserMenu } from "../UserMenu";

const mockPush = vi.fn();
const mockLogout = vi.fn();
const mockLogoutAll = vi.fn();

vi.mock("@/components/bridge/Dropdown", () => ({
  Dropdown: ({ children }: any) => <div>{children}</div>,
  DropdownTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownItem: ({ children, onPress, ...props }: any) => (
    <button onClick={onPress} type="button" {...props}>{children}</button>
  ),
  DropdownSection: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/bridge/Modal", () => ({
  Modal: Object.assign(
    ({ state, children }: any) => (state?.isOpen ? <div>{children}</div> : null),
    {
      Content: ({ children }: any) => <div>{children}</div>,
      Header: ({ children }: any) => <div>{children}</div>,
      Body: ({ children }: any) => <div>{children}</div>,
      Footer: ({ children }: any) => <div>{children}</div>,
    }
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/services/auth-domain.service", () => ({
  canAccessSuperAdminPortal: (user: any) => user?.role === "SUPER_ADMIN",
}));

const mockStoreLogout = vi.fn();
let mockStoreUser: any = null;

vi.mock("@/lib/stores/auth.store", () => ({
  useAuthStore: () => ({
    user: mockStoreUser,
    logout: mockStoreLogout,
  }),
}));

vi.mock("@/auth/runtime/createAuthProvider", () => ({
  createAuthProvider: () => Promise.resolve({
    logout: mockLogout,
    logoutAll: mockLogoutAll,
  }),
}));

vi.mock("@/hooks/auth/useAuthBroadcast", () => ({
  broadcastAuthEvent: vi.fn(),
}));

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreUser = null;
  });

  it("shows fallback avatar when no user", () => {
    const { container } = render(<UserMenu />);
    const avatarSpan = container.querySelector('[name="?"]');
    expect(avatarSpan).toBeInTheDocument();
  });

  it("shows user name and role when authenticated", async () => {
    mockStoreUser = {
      id: "1",
      name: "Juan Pérez",
      email: "juan@test.com",
      role: "ADMIN",
      permissions: [],
    };
    render(<UserMenu />);
    await waitFor(() => {
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
      expect(screen.getByText("Administrador")).toBeInTheDocument();
    });
  });

  it("logs out through the backend provider", async () => {
    mockStoreUser = {
      id: "1",
      name: "Test",
      email: "test@test.com",
      role: "ADMIN",
      permissions: [],
    };
    render(<UserMenu />);
    await waitFor(() => {
      expect(screen.getByText("Test")).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button");
    const logoutBtn = buttons.find((button) => button.textContent?.includes("Cerrar sesión") && !button.textContent?.includes("todas"));
    expect(logoutBtn).toBeDefined();

    if (logoutBtn) {
      await userEvent.click(logoutBtn);
    }

    const confirmBtn = await screen.findByRole("button", { name: /confirmar/i });
    await userEvent.click(confirmBtn);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockStoreLogout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});
