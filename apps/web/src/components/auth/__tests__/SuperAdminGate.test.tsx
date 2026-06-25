import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockReplace = vi.fn();
const mockCurrentUser = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/lib/services/auth-domain.service", () => ({
  currentUser: (...args: any[]) => mockCurrentUser(...args),
  canAccessSuperAdminPortal: (user: any) => user?.role === "SUPER_ADMIN",
}));

import { SuperAdminGate } from "../SuperAdminGate";

describe("SuperAdminGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders content for super admin", async () => {
    mockCurrentUser.mockResolvedValue({
      id: "1",
      name: "Admin",
      email: "admin@test.com",
      role: "SUPER_ADMIN",
      permissions: [],
    });
    render(
      <SuperAdminGate>
        <div>admin content</div>
      </SuperAdminGate>
    );
    await waitFor(() => {
      expect(screen.getByText("admin content")).toBeInTheDocument();
    });
  });

  it("shows loading state initially", () => {
    mockCurrentUser.mockReturnValue(new Promise(() => {}));
    render(
      <SuperAdminGate>
        <div>admin content</div>
      </SuperAdminGate>
    );
    expect(screen.getByText("Verificando acceso de administrador...")).toBeInTheDocument();
    expect(screen.queryByText("admin content")).not.toBeInTheDocument();
  });

  it("redirects non-super-admin to home", async () => {
    mockCurrentUser.mockResolvedValue({
      id: "2",
      name: "User",
      email: "user@test.com",
      role: "ADMIN",
      permissions: [],
    });
    render(
      <SuperAdminGate>
        <div>admin content</div>
      </SuperAdminGate>
    );
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
    expect(screen.queryByText("admin content")).not.toBeInTheDocument();
  });
});
