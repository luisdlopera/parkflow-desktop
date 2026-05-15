import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import UsersPage from "../users/page";

vi.mock("@/lib/auth", () => ({
  authHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test-token" }),
}));

describe("UsersPage", () => {
  it("renders the user management page", () => {
    render(<UsersPage />);
    expect(screen.getAllByText("Usuarios Administrativos").length).toBeGreaterThanOrEqual(1);
  });

  it("shows stats cards", () => {
    render(<UsersPage />);
    expect(screen.getAllByText("Total Usuarios").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("4").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the mock users list", () => {
    render(<UsersPage />);
    expect(screen.getAllByText("admin@parkflow.local").length).toBeGreaterThanOrEqual(1);
  });
});
