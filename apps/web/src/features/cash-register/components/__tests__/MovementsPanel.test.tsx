import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MovementsPanel from "../MovementsPanel";
import type { CashMovementDto } from "@/lib/cash/cash-api";

const movements: CashMovementDto[] = [
  {
    id: "mov-1",
    createdAt: "2026-06-22T10:00:00Z",
    movementType: "PARKING_PAYMENT",
    paymentMethod: "CASH",
    amount: 15000,
    createdByName: "Operador 1",
    terminal: "TERM-01",
    status: "POSTED",
  } as CashMovementDto,
  {
    id: "mov-2",
    createdAt: "2026-06-22T11:00:00Z",
    movementType: "MANUAL_INCOME",
    paymentMethod: "CARD",
    amount: 5000,
    createdByName: "Operador 2",
    terminal: "TERM-01",
    status: "POSTED",
  } as CashMovementDto,
];

vi.mock("@/components/bridge/Button", () => ({
  Button: ({ children, onPress, ...props }: any) => (
    <button onClick={onPress} {...props}>{children}</button>
  ),
}));

describe("MovementsPanel", () => {
  it("renders movements list", () => {
    render(
      <MovementsPanel
        p={{
          movements,
          isOpen: true,
          perms: { canVoid: false },
          setVoidTarget: vi.fn(),
        }}
      />,
    );

    expect(screen.getByText("Movimientos")).toBeInTheDocument();
    expect(screen.getByText("PARKING_PAYMENT")).toBeInTheDocument();
    expect(screen.getByText("MANUAL_INCOME")).toBeInTheDocument();
  });

  it("shows summary totals from movements", () => {
    render(
      <MovementsPanel
        p={{
          movements,
          isOpen: true,
          perms: { canVoid: false },
          setVoidTarget: vi.fn(),
        }}
      />,
    );

    expect(screen.getByText("15000")).toBeInTheDocument();
    expect(screen.getByText("5000")).toBeInTheDocument();
  });

  it("shows empty state when no movements and session is open", () => {
    render(
      <MovementsPanel
        p={{
          movements: [],
          isOpen: true,
          perms: { canVoid: false },
          setVoidTarget: vi.fn(),
        }}
      />,
    );

    expect(
      screen.getByText("No hay movimientos registrados en esta sesión."),
    ).toBeInTheDocument();
  });

  it("shows Anular button for POSTED movements when user can void", () => {
    render(
      <MovementsPanel
        p={{
          movements,
          isOpen: true,
          perms: { canVoid: true },
          setVoidTarget: vi.fn(),
        }}
      />,
    );

    const anularButtons = screen.getAllByText("Anular");
    expect(anularButtons).toHaveLength(2);
  });

  it("calls setVoidTarget when Anular is clicked", async () => {
    const setVoidTarget = vi.fn();
    const user = userEvent.setup();

    render(
      <MovementsPanel
        p={{
          movements,
          isOpen: true,
          perms: { canVoid: true },
          setVoidTarget,
        }}
      />,
    );

    const buttons = screen.getAllByText("Anular");
    await user.click(buttons[0]);
    expect(setVoidTarget).toHaveBeenCalledWith("mov-1");
  });
});
