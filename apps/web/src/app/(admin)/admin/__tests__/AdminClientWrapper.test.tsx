import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminClientWrapper from "../AdminClientWrapper";

const mockUseSidebar = vi.hoisted(() => vi.fn().mockReturnValue({
  isOpen: false,
  isCollapsed: false,
  toggle: vi.fn(),
  open: vi.fn(),
  close: vi.fn(),
}));

vi.mock("@/hooks/ui/useSidebar", () => ({
  useSidebar: mockUseSidebar,
}));

vi.mock("@/features/admin/AdminSidebar", () => ({
  AdminSidebar: ({ collapsed, onToggle }: { collapsed?: boolean; onToggle?: () => void }) => (
    <div data-testid="admin-sidebar" data-collapsed={collapsed}>
      <button data-testid="sidebar-toggle" onClick={onToggle}>Toggle</button>
    </div>
  ),
}));

vi.mock("@/features/admin/AdminMobileSidebar", () => ({
  AdminMobileSidebar: ({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) => (
    <div data-testid="admin-mobile-sidebar" data-open={isOpen}>
      <button data-testid="mobile-close" onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock("@/features/admin/AdminHeader", () => ({
  AdminHeader: ({ onMenuClick }: { onMenuClick?: () => void }) => (
    <div data-testid="admin-header">
      <button data-testid="menu-button" onClick={onMenuClick}>Menu</button>
    </div>
  ),
}));

describe("AdminClientWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders admin sidebar and header", () => {
    render(<AdminClientWrapper><div>content</div></AdminClientWrapper>);
    expect(screen.getByTestId("admin-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("admin-header")).toBeInTheDocument();
  });

  it("renders children inside main content area", () => {
    render(
      <AdminClientWrapper>
        <div data-testid="page-content">Page Content</div>
      </AdminClientWrapper>
    );
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("renders mobile sidebar", () => {
    render(<AdminClientWrapper><div /></AdminClientWrapper>);
    expect(screen.getByTestId("admin-mobile-sidebar")).toBeInTheDocument();
  });

  it("passes collapsed state to sidebar", () => {
    mockUseSidebar.mockReturnValue({
      isOpen: true,
      isCollapsed: true,
      toggle: vi.fn(),
      open: vi.fn(),
      close: vi.fn(),
    });
    render(<AdminClientWrapper><div /></AdminClientWrapper>);
    const sidebar = screen.getByTestId("admin-sidebar");
    expect(sidebar.getAttribute("data-collapsed")).toBe("true");
  });

  it("passes isOpen state to mobile sidebar", () => {
    mockUseSidebar.mockReturnValue({
      isOpen: true,
      isCollapsed: false,
      toggle: vi.fn(),
      open: vi.fn(),
      close: vi.fn(),
    });
    render(<AdminClientWrapper><div /></AdminClientWrapper>);
    const mobileSidebar = screen.getByTestId("admin-mobile-sidebar");
    expect(mobileSidebar.getAttribute("data-open")).toBe("true");
  });
});
