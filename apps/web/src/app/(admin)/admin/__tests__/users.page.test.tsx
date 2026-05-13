import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import UsersPage from "../users/page";

vi.mock("@/lib/auth", () => ({
  authHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test-token" }),
}));

describe("UsersPage", () => {
  it("renders the user management page", () => {
    render(<UsersPage />);
    expect(screen.getByText("Usuarios Administrativos")).toBeDefined();
  });

  it("shows stats cards", () => {
    render(<UsersPage />);
    expect(screen.getByText("Total Usuarios")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
  });

  it("renders the mock users list", () => {
    render(<UsersPage />);
    expect(screen.getByText("admin@parkflow.local")).toBeDefined();
  });
});
