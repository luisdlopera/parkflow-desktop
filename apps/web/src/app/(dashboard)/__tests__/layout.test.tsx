import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardLayout from "../layout";

vi.mock("@/components/auth/AuthGate", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-gate">{children}</div>
  ),
}));

vi.mock("@/components/theme/ThemeInitializer", () => ({
  ThemeInitializer: () => <div data-testid="theme-initializer" />,
}));

vi.mock("../DashboardClientWrapper", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-wrapper">{children}</div>
  ),
}));

describe("DashboardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children inside auth gate and dashboard wrapper", () => {
    render(<DashboardLayout><div data-testid="child">content</div></DashboardLayout>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByTestId("auth-gate")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-wrapper")).toBeInTheDocument();
  });

  it("renders ThemeInitializer", () => {
    render(<DashboardLayout><div /></DashboardLayout>);
    expect(screen.getByTestId("theme-initializer")).toBeInTheDocument();
  });

  it("places children inside the dashboard wrapper", () => {
    render(<DashboardLayout><span data-testid="inner">inner</span></DashboardLayout>);
    const wrapper = screen.getByTestId("dashboard-wrapper");
    expect(wrapper).toContainElement(screen.getByTestId("inner"));
  });

  it("wraps dashboard-wrapper in auth-gate", () => {
    render(<DashboardLayout><div /></DashboardLayout>);
    const gate = screen.getByTestId("auth-gate");
    const wrapper = screen.getByTestId("dashboard-wrapper");
    expect(gate).toContainElement(wrapper);
  });
});
