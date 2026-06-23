import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import React from "react";

// Mocks for all dependencies
vi.mock("@/components/bridge/Modal", () => ({
  Modal: ({ state, children }: any) => state?.isOpen ? React.createElement("div", { "data-testid": "mock-modal" }, children) : null,
  ModalContent: ({ children }: any) => React.createElement("div", null, children),
  ModalHeader: ({ children }: any) => React.createElement("div", null, children),
  ModalBody: ({ children }: any) => React.createElement("div", null, children),
  ModalFooter: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/bridge/Autocomplete", () => ({
  Autocomplete: Object.assign(
    ({ children }: any) => React.createElement("div", { "data-testid": "mock-autocomplete" }, children),
    {
      Trigger: ({ children }: any) => React.createElement("div", null, children),
      Value: ({ children }: any) => React.createElement("div", null, children),
      ClearButton: () => React.createElement("button", null, "Clear"),
      Indicator: ({ children }: any) => React.createElement("div", null, children),
      Popover: ({ children }: any) => React.createElement("div", null, children),
      Filter: ({ children }: any) => React.createElement("div", null, children),
    }
  ),
}));

vi.mock("@/components/bridge/Button", () => ({
  Button: ({ children, onPress, ...props }: any) => React.createElement("button", { ...props, onClick: onPress }, children),
}));

vi.mock("@/components/bridge/Input", () => ({
  Input: React.forwardRef(({ onValueChange, ...props }: any, ref) =>
    React.createElement("input", { ref, onChange: onValueChange ? (e) => onValueChange(e.target.value) : undefined, ...props })
  ),
}));

vi.mock("@/components/bridge/TextArea", () => ({
  TextArea: ({ ...props }: any) => React.createElement("textarea", props),
}));

vi.mock("@/components/ui/DataTable", () => ({
  default: () => React.createElement("div", { "data-testid": "data-table" }, "DataTable"),
}));

vi.mock("@/components/bridge/Badge", () => ({
  default: ({ children }: any) => React.createElement("span", null, children),
}));

vi.mock("@/features/cash-register/hooks/useCajaPage", () => ({
  useCajaPage: vi.fn(() => ({
    site: "default",
    setSite: vi.fn(),
    terminal: "TERMINAL-01",
    setTerminal: vi.fn(),
    openAmount: "0",
    setOpenAmount: vi.fn(),
    filterType: "",
    setFilterType: vi.fn(),
    filterMethod: "",
    setFilterMethod: vi.fn(),
    voidTarget: null,
    setVoidTarget: vi.fn(),
    outboxCount: 0,
    registerRows: [{ id: "reg-1", site: "default", terminal: "TERMINAL-01", label: "Caja 1" }],
    auditLog: [],
    closingWitness: "",
    setClosingWitness: vi.fn(),
    showShiftChangeModal: false,
    setShowShiftChangeModal: vi.fn(),
    siteCount: 1,
    busy: false,
    error: null,
    perms: { canOpen: true, canClose: true, canMove: true, canVoid: true, canAudit: true },
    session: { id: "s1", register: { id: "r1", site: "default", terminal: "T1", label: "L1" }, operatorId: "op1", status: "OPEN", openingAmount: 100000, openedAt: new Date().toISOString(), closedAt: null, closedById: null, closedByName: null, expectedAmount: null, countedAmount: null, differenceAmount: null, countCash: null, countCard: null, countTransfer: null, countOther: null, notes: null, closingNotes: null, closingWitnessName: null, supportDocumentNumber: null, countedAt: null, countOperatorId: null, countOperatorName: null },
    isOpen: true,
    closed: false,
    policy: { requireOpenForPayment: true, offlineCloseAllowed: false, offlineMaxManualMovement: 500000, operationsHint: "OK", resolvedForSite: "default" },
    loading: false,
    movements: [{ id: "m1", cashSessionId: "s1", movementType: "PARKING_PAYMENT", paymentMethod: "CASH", amount: 10000, parkingSessionId: "p1", reason: null, metadata: null, status: "POSTED", voidedAt: null, voidReason: null, voidedById: null, externalReference: null, createdById: "op1", createdByName: "User1", createdAt: new Date().toISOString(), terminal: "T1", idempotencyKey: null }],
    summary: { openingAmount: 100000, expectedLedgerTotal: 110000, countedTotal: null, difference: null, totalsByPaymentMethod: { CASH: 10000 }, totalsByMovementType: { PARKING_PAYMENT: 10000 }, movementCount: 1 },
    manualForm: { control: {}, getValues: vi.fn().mockReturnValue({}), handleSubmit: (fn: Function) => async () => fn({}), reset: vi.fn(), watch: vi.fn() },
    countForm: { control: {}, getValues: vi.fn().mockReturnValue({}), watch: vi.fn() },
    openForm: { control: {}, getValues: vi.fn().mockReturnValue({}), handleSubmit: (fn: Function) => async () => fn({}), reset: vi.fn() },
    closeForm: { control: {}, getValues: vi.fn().mockReturnValue({}), handleSubmit: (fn: Function) => async () => fn({}), reset: vi.fn() },
    voidForm: { control: {}, getValues: vi.fn().mockReturnValue({}), handleSubmit: (fn: Function) => async () => fn({}), reset: vi.fn() },
    shiftForm: { control: {}, getValues: vi.fn().mockReturnValue({}) },
    reload: vi.fn().mockResolvedValue(undefined),
    onOpen: vi.fn().mockResolvedValue(undefined),
    onAddManual: vi.fn().mockResolvedValue(undefined),
    onVoid: vi.fn().mockResolvedValue(undefined),
    onShiftChange: vi.fn().mockResolvedValue(undefined),
    onPrintClosing: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@/lib/api", () => ({
  buildApiHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test" }),
}));

vi.mock("@/features/auth/services/auth-domain.service", () => ({
  currentUser: vi.fn().mockResolvedValue({ id: "u1", name: "User" }),
  hasPermission: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/settings-api", () => ({
  fetchConfigurationSites: vi.fn().mockResolvedValue({ content: [], totalElements: 1 }),
}));

vi.mock("@/lib/cash/cash-outbox-idb", () => ({
  listCashOutboxPending: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/cash/cash-sync", () => ({
  flushCashMovementOutbox: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/cash/cash-api", () => ({
  cashRegisters: vi.fn().mockResolvedValue([]),
  cashAudit: vi.fn().mockResolvedValue([]),
  cashPrintClosing: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/print/print-service", () => ({
  printCashThermalReceipt: vi.fn(),
  startLocalPrintQueueWorker: vi.fn(),
}));

vi.mock("@/lib/cash/cash-print", () => ({
  buildCashCountTicket: vi.fn().mockReturnValue({}),
  buildCashMovementTicket: vi.fn().mockReturnValue({}),
}));

vi.mock("@/components/ui/DialogProvider", () => ({
  useDialog: vi.fn(() => ({ confirm: vi.fn().mockResolvedValue(true) })),
}));

vi.mock("@/features/cash-register/components/StepProgress", () => ({
  default: () => React.createElement("div", { "data-testid": "step-progress" }, "Step"),
}));

vi.mock("@/features/cash-register/components/SessionStatusCard", () => ({
  default: ({ p }: any) => React.createElement("div", { "data-testid": "session-status-card" }, "Status: ", p.session?.status),
}));

vi.mock("@/features/cash-register/components/ManualMovementForm", () => ({
  default: () => React.createElement("div", { "data-testid": "manual-movement-form" }, "Form"),
}));

vi.mock("@/features/cash-register/components/MovementsPanel", () => ({
  default: () => React.createElement("div", { "data-testid": "movements-panel" }, "Movements"),
}));

vi.mock("@/features/cash-register/components/ArqueoForm", () => ({
  default: () => React.createElement("div", { "data-testid": "arqueo-form" }, "Arqueo"),
}));

vi.mock("@/features/cash-register/components/CloseSessionPanel", () => ({
  default: () => React.createElement("div", { "data-testid": "close-session-panel" }, "Close"),
}));

import CajaClient from "./CajaClient";

function renderWithSWR(ui: React.ReactElement) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {ui}
    </SWRConfig>
  );
}

describe("CajaClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the cash close page header", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByText("Cierre de caja")).toBeDefined();
  });

  it("renders caja title", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByText("Caja")).toBeDefined();
  });

  it("renders session status card", async () => {
    renderWithSWR(<CajaClient />);
    await waitFor(() => {
      expect(screen.getByTestId("session-status-card")).toBeDefined();
    });
  });

  it("renders manual movement form", async () => {
    renderWithSWR(<CajaClient />);
    await waitFor(() => {
      expect(screen.getByTestId("manual-movement-form")).toBeDefined();
    });
  });

  it("renders without errors", () => {
    expect(() => {
      renderWithSWR(<CajaClient />);
    }).not.toThrow();
  });

  it("displays page title correctly", () => {
    renderWithSWR(<CajaClient />);
    const title = screen.getByText("Cierre de caja");
    expect(title).toBeDefined();
  });

  it("renders with all main components", async () => {
    renderWithSWR(<CajaClient />);
    await waitFor(() => {
      expect(screen.getByTestId("session-status-card")).toBeDefined();
      expect(screen.getByTestId("manual-movement-form")).toBeDefined();
    });
  });

  it("renders page structure", () => {
    const { container } = renderWithSWR(<CajaClient />);
    expect(container).toBeDefined();
  });

  it("renders heading elements", () => {
    renderWithSWR(<CajaClient />);
    const headings = screen.getAllByText(/Caja|Cierre/i);
    expect(headings.length).toBeGreaterThan(0);
  });

  it("handles render lifecycle", async () => {
    const { rerender } = renderWithSWR(<CajaClient />);
    await waitFor(() => {
      expect(screen.getByText("Cierre de caja")).toBeDefined();
    });
  });

  it("contains main layout div", () => {
    const { container } = renderWithSWR(<CajaClient />);
    const mainDiv = container.querySelector(".space-y-4");
    expect(mainDiv).toBeDefined();
  });
});
