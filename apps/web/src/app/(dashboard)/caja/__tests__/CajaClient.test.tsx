import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CajaClient from "../CajaClient";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/components/ui/DialogProvider", () => ({
  useDialog: vi.fn().mockReturnValue({ confirm: vi.fn().mockResolvedValue(true) }),
  DialogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const defaultPageState = {
  caja: null,
  session: { id: "session-1", status: "OPEN", createdAt: "2026-06-22T09:00:00Z", balance: 50000 },
  isOpen: true,
  closed: false,
  loading: false,
  busy: false,
  error: null,
  outboxCount: 0,
  site: "SITE-001",
  siteCount: 1,
  registerRows: [{ terminal: "TERM-01", label: "Terminal 1" }],
  terminal: "TERM-01",
  setTerminal: vi.fn(),
  setSite: vi.fn(),
  movements: [
    { id: "mov-1", createdAt: "2026-06-22T09:30:00Z", movementType: "PARKING_PAYMENT", paymentMethod: "CASH", amount: 5000, createdByName: "Admin", terminal: "TERM-01", status: "POSTED" },
  ],
  filterType: "",
  filterMethod: "",
  setFilterType: vi.fn(),
  setFilterMethod: vi.fn(),
  openAmount: "10000",
  setOpenAmount: vi.fn(),
  onOpen: vi.fn().mockResolvedValue(true),
  onPrintClosing: vi.fn().mockResolvedValue(true),
  onShiftChange: vi.fn().mockResolvedValue(true),
  onVoid: vi.fn().mockResolvedValue(true),
  reload: vi.fn().mockResolvedValue(true),
  voidTarget: null,
  setVoidTarget: vi.fn(),
  showShiftChangeModal: false,
  setShowShiftChangeModal: vi.fn(),
  shiftForm: { control: {} as any },
  voidForm: { control: {} as any },
  perms: { canOpen: true, canClose: true, canVoid: true },
  CashSummaryTotals: null,
};

vi.mock("@/features/cash-register/hooks/useCajaPage", () => ({
  useCajaPage: vi.fn(() => defaultPageState),
}));

vi.mock("@/features/cash-register/components/SessionStatusCard", () => ({
  default: ({ p }: any) => <div data-testid="session-status-card">{p.session?.status}</div>,
}));

vi.mock("@/features/cash-register/components/ManualMovementForm", () => ({
  default: () => <div data-testid="manual-movement-form" />,
}));

vi.mock("@/features/cash-register/components/MovementsPanel", () => ({
  default: () => <div data-testid="movements-panel" />,
}));

vi.mock("@/features/cash-register/components/ArqueoForm", () => ({
  default: () => <div data-testid="arqueo-form" />,
}));

vi.mock("@/features/cash-register/components/CloseSessionPanel", () => ({
  default: () => <div data-testid="close-session-panel" />,
}));

vi.mock("@/features/cash-register/components/StepProgress", () => ({
  default: () => <div data-testid="step-progress" />,
}));

import { useCajaPage } from "@/features/cash-register/hooks/useCajaPage";

describe("CajaClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCajaPage).mockReturnValue(defaultPageState);
  });

  it("renders cash register page with header", () => {
    render(<CajaClient />);
    expect(screen.getByText("Cierre de caja")).toBeInTheDocument();
  });

  it("renders session status card when session is open", () => {
    render(<CajaClient />);
    expect(screen.getByTestId("session-status-card")).toBeInTheDocument();
  });

  it("renders movements section when session is open", () => {
    render(<CajaClient />);
    const movements = screen.getAllByText("Movimientos");
    expect(movements.length).toBeGreaterThanOrEqual(2);
  });

  it("renders movement rows inside the table", () => {
    render(<CajaClient />);
    expect(screen.getByText("PARKING_PAYMENT")).toBeInTheDocument();
    expect(screen.getByText("CASH")).toBeInTheDocument();
  });

  it("renders tabs for open session options", () => {
    render(<CajaClient />);
    expect(screen.getByText("Arqueos")).toBeInTheDocument();
    expect(screen.getByText("Cierre")).toBeInTheDocument();
  });

  it("shows error banner when error exists", () => {
    vi.mocked(useCajaPage).mockReturnValue({
      ...defaultPageState,
      error: "Error de conexión",
    });
    render(<CajaClient />);
    expect(screen.getByText("Error de conexión")).toBeInTheDocument();
  });

  it("shows outbox sync alert when outboxCount > 0", () => {
    vi.mocked(useCajaPage).mockReturnValue({
      ...defaultPageState,
      outboxCount: 3,
    });
    render(<CajaClient />);
    expect(screen.getByText(/Alerta de Sincronización/i)).toBeInTheDocument();
  });

  it("shows open form when no session", () => {
    vi.mocked(useCajaPage).mockReturnValue({
      ...defaultPageState,
      session: null,
      isOpen: false,
    });
    render(<CajaClient />);
    const abrirCajaElements = screen.getAllByText("Abrir caja");
    expect(abrirCajaElements.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId("initial-amount")).toBeInTheDocument();
  });
});
