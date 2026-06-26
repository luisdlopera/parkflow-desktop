import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UsersSection from "../UsersSection";
import type { UserAdminRow } from "@/lib/api/users-api";

const mockUsers: UserAdminRow[] = [
  {
    id: "user-1",
    name: "Juan Perez",
    email: "juan@test.com",
    role: "CAJERO",
    document: "123456789",
    phone: "3001234567",
    site: "SEDE-A",
    terminal: "TERM-01",
    active: true,
    lastAccessAt: "2026-06-21T10:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-06-21T10:00:00Z",
  },
  {
    id: "user-2",
    name: "Maria Gomez",
    email: "maria@test.com",
    role: "ADMIN",
    document: null,
    phone: null,
    site: null,
    terminal: null,
    active: false,
    lastAccessAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

const mockFetchUsers = vi.fn();
const mockFetchUserById = vi.fn();
const mockCreateUser = vi.fn();
const mockPatchUser = vi.fn();
const mockPatchUserStatus = vi.fn();
const mockResetUserPassword = vi.fn();

vi.mock("@/lib/settings-api", async () => {
  const actual = await vi.importActual("@/lib/settings-api");
  return {
    ...actual,
    fetchUsers: (...args: any[]) => mockFetchUsers(...args),
    fetchUserById: (...args: any[]) => mockFetchUserById(...args),
    createUser: (...args: any[]) => mockCreateUser(...args),
    patchUser: (...args: any[]) => mockPatchUser(...args),
    patchUserStatus: (...args: any[]) => mockPatchUserStatus(...args),
    resetUserPassword: (...args: any[]) => mockResetUserPassword(...args),
  };
});

vi.mock("@/components/ui/DialogProvider", () => ({
  useDialog: () => ({
    confirm: vi.fn().mockResolvedValue(true),
    prompt: vi.fn().mockResolvedValue("new-password-123"),
  }),
}));

describe("UsersSection", () => {
  const onNotify = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUsers.mockResolvedValue({ content: mockUsers, totalPages: 1 });
    mockFetchUserById.mockResolvedValue(mockUsers[0]);
    mockCreateUser.mockResolvedValue({ id: "user-3" });
    mockPatchUser.mockResolvedValue(undefined);
    mockPatchUserStatus.mockResolvedValue(undefined);
    mockResetUserPassword.mockResolvedValue(undefined);
  });

  it("renders DataTable with users", async () => {
    render(<UsersSection canEdit={true} onNotify={onNotify} auditReason="test" />);

    await waitFor(() => {
      expect(mockFetchUsers).toHaveBeenCalled();
    });

    expect(screen.getByText("Juan Perez")).toBeInTheDocument();
    expect(screen.getByText("Maria Gomez")).toBeInTheDocument();
  });

  it("shows Nuevo usuario button when canEdit is true", async () => {
    render(<UsersSection canEdit={true} onNotify={onNotify} auditReason="test" />);

    await waitFor(() => {
      expect(screen.getByText("Nuevo usuario")).toBeInTheDocument();
    });
  });

  it("hides Nuevo usuario button when canEdit is false", () => {
    render(<UsersSection canEdit={false} onNotify={onNotify} auditReason="test" />);

    expect(screen.queryByText("Nuevo usuario")).not.toBeInTheDocument();
  });

  it("opens create panel when Nuevo usuario is clicked", async () => {
    const user = userEvent.setup();
    render(<UsersSection canEdit={true} onNotify={onNotify} auditReason="test" />);

    await waitFor(() => {
      expect(screen.getByText("Nuevo usuario")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Nuevo usuario"));
    expect(screen.getByText("Crear")).toBeInTheDocument();
    expect(screen.getByText("Cerrar")).toBeInTheDocument();
  });

  it("shows edit button for each user when canEdit is true", async () => {
    render(<UsersSection canEdit={true} onNotify={onNotify} auditReason="test" />);

    await waitFor(() => {
      const editButtons = screen.getAllByText("Editar");
      expect(editButtons.length).toBeGreaterThan(0);
    });
  });

  it("opens edit panel when Editar is clicked", async () => {
    const user = userEvent.setup();
    render(<UsersSection canEdit={true} onNotify={onNotify} auditReason="test" />);

    await waitFor(() => {
      expect(screen.getAllByText("Editar").length).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByText("Editar")[0]);
    expect(screen.getByText("Editar usuario")).toBeInTheDocument();
    expect(screen.getByDisplayValue("juan@test.com")).toBeInTheDocument();
  });

  it("calls patchUserStatus when toggling status", async () => {
    const user = userEvent.setup();
    render(<UsersSection canEdit={true} onNotify={onNotify} auditReason="test" />);

    await waitFor(() => {
      expect(screen.getByText("Inactivar")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Inactivar"));
    await waitFor(() => {
      expect(mockPatchUserStatus).toHaveBeenCalledWith("user-1", false, "test");
    });
  });

  it("shows error when fetch fails", async () => {
    mockFetchUsers.mockRejectedValue(new Error("Error de conexión"));
    render(<UsersSection canEdit={true} onNotify={onNotify} auditReason="test" />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it("renders Detalle button and shows user detail", async () => {
    const user = userEvent.setup();
    render(<UsersSection canEdit={true} onNotify={onNotify} auditReason="test" />);

    await waitFor(() => {
      const detalleButtons = screen.getAllByText("Detalle");
      expect(detalleButtons.length).toBeGreaterThan(0);
    });

    const detalleButtons = screen.getAllByText("Detalle");
    await user.click(detalleButtons[0]);
    await waitFor(() => {
      expect(screen.getByText("Detalle usuario")).toBeInTheDocument();
    });
  });
});
