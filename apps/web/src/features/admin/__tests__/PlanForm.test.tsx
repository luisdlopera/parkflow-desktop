import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanForm } from "../PlanForm";
import type { Plan } from "@/lib/plans/types";

const mockOnSubmit = vi.hoisted(() => vi.fn());
const mockToastDanger = vi.hoisted(() => vi.fn());

vi.mock("@heroui/react", async () => {
  const actual = await vi.importActual("@heroui/react");
  return {
    ...actual,
    Separator: ({ ...props }: any) => <hr data-testid="separator" {...props} />,
    toast: {
      danger: mockToastDanger,
    },
  };
});

vi.mock("@/components/bridge/Button", () => ({
  Button: ({ children, onPress, isLoading, type }: any) => (
    <button type={type} onClick={onPress} disabled={isLoading} data-testid={type === "submit" ? "submit-button" : "button"}>
      {isLoading ? "Guardando..." : children}
    </button>
  ),
}));

vi.mock("@/components/bridge/Input", () => ({
  Input: ({ label, value, onValueChange, type, isInvalid, errorMessage }: any) => (
    <div>
      <label>{label}</label>
      <input
        type={type || "text"}
        value={value ?? ""}
        onChange={(e) => onValueChange && onValueChange(e.target.value)}
        aria-invalid={isInvalid}
        data-testid={`input-${label}`}
      />
      {isInvalid && errorMessage && <span role="alert">{errorMessage}</span>}
    </div>
  ),
}));

vi.mock("@/components/bridge/TextArea", () => ({
  TextArea: ({ label, value, onValueChange }: any) => (
    <div>
      <label>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onValueChange && onValueChange(e.target.value)}
        data-testid={`textarea-${label}`}
      />
    </div>
  ),
}));

vi.mock("@/components/bridge/Switch", () => ({
  Switch: ({ children, isSelected, onValueChange, id }: any) => (
    <label>
      <input
        id={id}
        type="checkbox"
        checked={isSelected}
        onChange={(e) => onValueChange && onValueChange(e.target.checked)}
        data-testid={id ? `switch-${id}` : "switch"}
      />
      {children}
    </label>
  ),
}));

vi.mock("@/components/bridge/Alert", () => ({
  Alert: ({ children }: any) => <div role="alert">{children}</div>,
}));

const initialPlan: Plan = {
  id: "plan-1",
  code: "PRO",
  name: "Plan Pro",
  description: "Plan profesional",
  monthlyPrice: 99,
  yearlyPrice: 999,
  isActive: true,
  features: {
    clients: true,
    contracts: false,
    memberships: false,
    reports: true,
    appointments: false,
    attendanceControl: false,
    integrations: false,
    apiAccess: false,
    mobileAppAccess: false,
    billing: false,
    customBranding: false,
  },
  createdAt: "2026-01-01T00:00:00Z",
};

describe("PlanForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  it("renders form fields", () => {
    render(<PlanForm onSubmit={mockOnSubmit} />);

    expect(screen.getByText("Nombre del plan")).toBeInTheDocument();
    expect(screen.getByText("Descripción")).toBeInTheDocument();
    expect(screen.getByText("Precio mensual")).toBeInTheDocument();
    expect(screen.getByText("Precio anual")).toBeInTheDocument();
    expect(screen.getByText("Plan activo")).toBeInTheDocument();
  });

  it("validates required name field", async () => {
    const user = userEvent.setup();
    render(<PlanForm onSubmit={mockOnSubmit} />);

    const nameInput = screen.getByTestId("input-Nombre del plan");
    await user.clear(nameInput);

    await user.click(screen.getByTestId("submit-button"));

    expect(screen.getByText("El nombre del plan es obligatorio")).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("submits create plan with valid data", async () => {
    const user = userEvent.setup();
    render(<PlanForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByTestId("input-Nombre del plan"), "Plan Básico");
    await user.type(screen.getByTestId("textarea-Descripción"), "Descripción del plan");
    await user.clear(screen.getByTestId("input-Precio mensual"));
    await user.type(screen.getByTestId("input-Precio mensual"), "49");
    await user.clear(screen.getByTestId("input-Precio anual"));
    await user.type(screen.getByTestId("input-Precio anual"), "499");

    await user.click(screen.getByTestId("submit-button"));

    await expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const submitted = mockOnSubmit.mock.calls[0][0];
    expect(submitted.name).toBe("Plan Básico");
    expect(submitted.description).toBe("Descripción del plan");
    expect(submitted.monthlyPrice).toBe(49);
    expect(submitted.yearlyPrice).toBe(499);
    expect(submitted.isActive).toBe(true);
  });

  it("submits edit plan with initial data", async () => {
    const user = userEvent.setup();
    render(<PlanForm onSubmit={mockOnSubmit} initialData={initialPlan} />);

    expect(screen.getByTestId("input-Nombre del plan")).toHaveValue("Plan Pro");
    expect(screen.getByTestId("input-Precio mensual")).toHaveValue(99);

    await user.clear(screen.getByTestId("input-Nombre del plan"));
    await user.type(screen.getByTestId("input-Nombre del plan"), "Plan Pro Actualizado");

    await user.click(screen.getByTestId("submit-button"));

    await expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const submitted = mockOnSubmit.mock.calls[0][0];
    expect(submitted.name).toBe("Plan Pro Actualizado");
    expect(submitted.monthlyPrice).toBe(99);
  });

  it("toggles feature switches", async () => {
    const user = userEvent.setup();
    render(<PlanForm onSubmit={mockOnSubmit} />);

    const contractsSwitch = screen.getByTestId("switch-feature-contracts");
    expect(contractsSwitch).not.toBeChecked();

    await user.click(contractsSwitch);
    expect(contractsSwitch).toBeChecked();
  });
});
