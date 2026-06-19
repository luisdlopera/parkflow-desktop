import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import dynamic from "next/dynamic";
import { AdminUsersPageClient as UsersPage } from "@/app/(admin)/admin/users/UsersPageClient";
import { DialogProvider } from "@/components/ui/DialogProvider";

vi.mock("@/features/auth/api/auth.api", () => ({
  authHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test-token" }),
}));
vi.mock("@/features/auth/services/auth-storage.service", () => ({
  authHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test-token" }),
}));
vi.mock("@/features/auth/services/auth-domain.service", () => ({
  authHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test-token" }),
}));

describe("UsersPage", () => {
  it("renders the user management page", () => {
    render(<DialogProvider><UsersPage /></DialogProvider>);
    expect(screen.getByText("Usuarios Administrativos")).toBeDefined();
  });

  it("shows stats cards", () => {
    render(<DialogProvider><UsersPage /></DialogProvider>);
    expect(screen.getByText("Total")).toBeDefined();
    expect(screen.getByText("Activos")).toBeDefined();
    expect(screen.getAllByText("0").length).toBe(2);
  });

  it("renders the empty users list", () => {
    render(<DialogProvider><UsersPage /></DialogProvider>);
    expect(screen.getByText("No se encontraron registros")).toBeDefined();
  });
});
