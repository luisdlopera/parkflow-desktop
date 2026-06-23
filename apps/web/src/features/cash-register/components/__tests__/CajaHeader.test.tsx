import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SessionStatusCard from "../SessionStatusCard";

vi.mock("@/components/bridge/Badge", () => ({
  default: ({ label, tone, ...props }: any) => (
    <span data-testid="cash-status" data-tone={tone} {...props}>
      {label}
    </span>
  ),
}));

vi.mock("@/app/(dashboard)/caja/CashSummaryTotals", () => ({
  CashSummaryTotals: ({ summary }: any) => (
    <div data-testid="cash-summary-totals">
      Expected: ${summary?.expectedLedgerTotal}
    </div>
  ),
}));

vi.mock("@/app/(dashboard)/caja/CashAuditLog", () => ({
  CashAuditLog: ({ auditLog }: any) => (
    <div data-testid="cash-audit-log">{auditLog?.length ?? 0} entries</div>
  ),
}));

vi.mock("@/features/cash-register/components/StepProgress", () => ({
  default: ({ stepsState }: any) => (
    <div data-testid="step-progress">
      {stepsState.map((s: any) => (
        <span key={s.label} data-done={s.done}>{s.label}</span>
      ))}
    </div>
  ),
}));

describe("CajaHeader (SessionStatusCard)", () => {
  const baseSession = {
    id: "sess-1",
    status: "OPEN",
    openedAt: "2026-06-22T08:00:00Z",
    operatorName: "Juan Perez",
    countedAt: null,
    notes: null,
  };

  it("shows session info when open", () => {
    render(
      <SessionStatusCard
        p={{
          session: baseSession,
          isOpen: true,
          allMovements: [],
          summary: null,
          perms: { canAudit: false },
          auditLog: [],
        }}
      />,
    );

    expect(screen.getByTestId("cash-status")).toHaveTextContent("Caja abierta");
    expect(screen.getByText(/Juan Perez/)).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("shows status badge with closed status", () => {
    render(
      <SessionStatusCard
        p={{
          session: { ...baseSession, status: "CLOSED" },
          isOpen: false,
          allMovements: [],
          summary: null,
          perms: { canAudit: false },
          auditLog: [],
        }}
      />,
    );

    const badge = screen.getByTestId("cash-status");
    expect(badge).toHaveTextContent("Caja cerrada");
    expect(badge).toHaveAttribute("data-tone", "neutral");
  });

  it("shows actions (step progress) when session is open", () => {
    render(
      <SessionStatusCard
        p={{
          session: baseSession,
          isOpen: true,
          allMovements: [],
          summary: null,
          perms: { canAudit: false },
          auditLog: [],
        }}
      />,
    );

    expect(screen.getByTestId("step-progress")).toBeInTheDocument();
  });

  it("shows CashSummaryTotals summary", () => {
    render(
      <SessionStatusCard
        p={{
          session: baseSession,
          isOpen: true,
          allMovements: [],
          summary: { expectedLedgerTotal: 75000 },
          perms: { canAudit: false },
          auditLog: [],
        }}
      />,
    );

    expect(screen.getByTestId("cash-summary-totals")).toHaveTextContent("75000");
  });

  it("shows audit log action when user can audit", () => {
    render(
      <SessionStatusCard
        p={{
          session: baseSession,
          isOpen: true,
          allMovements: [],
          summary: null,
          perms: { canAudit: true },
          auditLog: [{ action: "OPEN", timestamp: "2026-06-22T08:00:00Z", userId: "u1" }],
        }}
      />,
    );

    expect(screen.getByTestId("cash-audit-log")).toBeInTheDocument();
    expect(screen.getByText("1 entries")).toBeInTheDocument();
  });
});
