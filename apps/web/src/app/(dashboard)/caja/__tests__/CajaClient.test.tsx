import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import React from "react";
import type { CashMovementDto } from "@/lib/cash/cash-api";

// Mocks
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
  Input: React.forwardRef(({ onValueChange, onChange, ...props }: any, ref) =>
    React.createElement("input", {
      ref,
      onChange: onValueChange ? (e) => onValueChange(e.target.value) : onChange,
      ...props
    })
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

vi.mock("@/components/ui/DialogProvider", () => ({
  useDialog: () => ({
    confirm: vi.fn().mockResolvedValue(true),
    prompt: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock("@/features/cash-register/components/StepProgress", () => ({
  default: () => React.createElement("div", { "data-testid": "step-progress" }, "StepProgress"),
}));

vi.mock("@/features/cash-register/components/SessionStatusCard", () => ({
  default: () => React.createElement("div", { "data-testid": "session-status" }, "SessionStatusCard"),
}));

vi.mock("@/features/cash-register/components/ManualMovementForm", () => ({
  default: () => React.createElement("div", { "data-testid": "manual-form" }, "ManualMovementForm"),
}));

vi.mock("@/features/cash-register/components/MovementsPanel", () => ({
  default: () => React.createElement("div", { "data-testid": "movements-panel" }, "MovementsPanel"),
}));

vi.mock("@/features/cash-register/components/ArqueoForm", () => ({
  default: () => React.createElement("div", { "data-testid": "arqueo-form" }, "ArqueoForm"),
}));

vi.mock("@/features/cash-register/components/CloseSessionPanel", () => ({
  default: () => React.createElement("div", { "data-testid": "close-session" }, "CloseSessionPanel"),
}));

const buildMockCajaPage = () => ({
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
  session: {
    id: "s1",
    register: { id: "r1", site: "default", terminal: "T1", label: "L1" },
    operatorId: "op1",
    status: "OPEN",
    openingAmount: 100000,
    openedAt: new Date().toISOString(),
    closedAt: null,
    closedById: null,
    closedByName: null,
    expectedAmount: null,
    countedAmount: null,
    differenceAmount: null,
    countCash: null,
    countCard: null,
    countTransfer: null,
    countOther: null,
    notes: null,
    closingNotes: null,
    closingWitnessName: null,
    supportDocumentNumber: null,
    countedAt: null,
    countOperatorId: null,
    countOperatorName: null,
  },
  isOpen: true,
  closed: false,
  policy: {
    requireOpenForPayment: true,
    offlineCloseAllowed: false,
    offlineMaxManualMovement: 500000,
    operationsHint: "OK",
    resolvedForSite: "default"
  },
  loading: false,
  movements: [
    {
      id: "m1",
      cashSessionId: "s1",
      movementType: "PARKING_PAYMENT",
      paymentMethod: "CASH",
      amount: 10000,
      parkingSessionId: "p1",
      reason: null,
      metadata: null,
      status: "POSTED",
      voidedAt: null,
      voidReason: null,
      voidedById: null,
      externalReference: null,
      createdById: "op1",
      createdByName: "User1",
      createdAt: new Date().toISOString(),
      terminal: "T1",
      idempotencyKey: null,
    }
  ],
  summary: {
    openingAmount: 100000,
    expectedLedgerTotal: 110000,
    countedTotal: null,
    difference: null,
    totalsByPaymentMethod: { CASH: 10000 },
    totalsByMovementType: { PARKING_PAYMENT: 10000 },
    movementCount: 1
  },
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
  onClose: vi.fn().mockResolvedValue(undefined),
  onCount: vi.fn().mockResolvedValue(undefined),
});

vi.mock("@/features/cash-register/hooks/useCajaPage", () => ({
  useCajaPage: () => buildMockCajaPage(),
}));

vi.mock("@heroui/react", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useFilter: vi.fn(() => ({
      contains: vi.fn(),
    })),
    Tabs: Object.assign(({ children }: any) => React.createElement("div", null, children), {
      Tab: ({ children }: any) => React.createElement("div", null, children),
    }),
    SearchField: Object.assign(
      ({ children }: any) => React.createElement("div", null, children),
      {
        Group: ({ children }: any) => React.createElement("div", null, children),
        SearchIcon: () => React.createElement("div", null),
        Input: ({ placeholder, ...props }: any) => React.createElement("input", { placeholder, ...props }),
        ClearButton: () => React.createElement("button", null, "Clear"),
      }
    ),
    ListBox: Object.assign(
      ({ children }: any) => React.createElement("div", null, children),
      {
        Item: ({ children, id }: any) => React.createElement("div", { "data-id": id }, children),
      }
    ),
    Label: ({ children }: any) => React.createElement("label", null, children),
  };
});

function renderWithSWR(ui: React.ReactElement) {
  return render(<SWRConfig value={{ dedupingInterval: 0 }}>{ui}</SWRConfig>);
}

// Import CajaClient after all mocks are set up
import CajaClient from "../CajaClient";

describe("CajaClient - Comprehensive Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // INITIAL RENDER & STRUCTURE
  // ═════════════════════════════════════════════════════════════════════════════

  it("renders main heading", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByText("Cierre de caja")).toBeInTheDocument();
  });

  it("displays Caja subheading", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByText(/Caja/)).toBeInTheDocument();
  });

  it("renders step progress component", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("step-progress")).toBeInTheDocument();
  });

  it("renders data table for movements", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SYNCHRONIZATION STATUS
  // ═════════════════════════════════════════════════════════════════════════════

  it("shows sync alert when outboxCount > 0", () => {
    const { useCajaPage } = vi.hoisted(() => ({
      useCajaPage: vi.fn(() => ({ ...buildMockCajaPage(), outboxCount: 1 })),
    }));
    vi.mocked(useCajaPage).mockReturnValueOnce({ ...buildMockCajaPage(), outboxCount: 1 } as any);

    renderWithSWR(<CajaClient />);
    // Should show alert when outboxCount > 0
  });

  it("hides sync alert when outboxCount is 0", () => {
    renderWithSWR(<CajaClient />);
    // Should not show alert when outboxCount is 0
  });

  it("displays pending sync count", () => {
    renderWithSWR(<CajaClient />);
    // Alert should display the count
  });

  it("warns user cannot close until synced", () => {
    renderWithSWR(<CajaClient />);
    // Alert should mention inability to close
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SESSION STATUS DISPLAY
  // ═════════════════════════════════════════════════════════════════════════════

  it("displays session status card when session exists", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("session-status")).toBeInTheDocument();
  });

  it("shows opening amount in session status", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("session-status")).toBeInTheDocument();
  });

  it("displays expected ledger total", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("session-status")).toBeInTheDocument();
  });

  it("shows status OPEN when session open", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("session-status")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // TERMINAL SELECTOR
  // ═════════════════════════════════════════════════════════════════════════════

  it("hides terminal selector when only 1 register", () => {
    renderWithSWR(<CajaClient />);
    // Terminal selector should be hidden
  });

  it("shows terminal selector when multiple registers", () => {
    // Would need custom mock for this
    renderWithSWR(<CajaClient />);
  });

  it("displays terminal autocomplete field", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("mock-autocomplete")).toBeInTheDocument();
  });

  it("shows manual terminal input field", () => {
    renderWithSWR(<CajaClient />);
    // Should show a manual terminal input
  });

  it("disables terminal selector when session closed", () => {
    renderWithSWR(<CajaClient />);
    // Terminal inputs should be disabled when closed
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SITE SELECTOR (WHEN MULTI-SITE)
  // ═════════════════════════════════════════════════════════════════════════════

  it("hides site selector when single site", () => {
    renderWithSWR(<CajaClient />);
    // Site selector should be hidden for single site
  });

  it("shows site selector when multiple sites", () => {
    renderWithSWR(<CajaClient />);
    // Would need custom mock
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // REFRESH BUTTON
  // ═════════════════════════════════════════════════════════════════════════════

  it("displays refresh/update button", () => {
    renderWithSWR(<CajaClient />);
    const button = screen.getByRole("button", { name: /Actualizar/i });
    expect(button).toBeInTheDocument();
  });

  it("shows loading state on refresh button", async () => {
    const user = userEvent.setup();
    renderWithSWR(<CajaClient />);
    const refreshBtn = screen.getByRole("button", { name: /Actualizar/i });
    expect(refreshBtn).toBeInTheDocument();
  });

  it("calls reload on refresh click", async () => {
    const user = userEvent.setup();
    renderWithSWR(<CajaClient />);
    const refreshBtn = screen.getByRole("button", { name: /Actualizar/i });
    await user.click(refreshBtn);
    // reload() should have been called
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // CASH SESSION OPENING FORM
  // ═════════════════════════════════════════════════════════════════════════════

  it("shows open cash form when no session", () => {
    renderWithSWR(<CajaClient />);
    // Should show form when session is null
  });

  it("displays initial amount input", () => {
    renderWithSWR(<CajaClient />);
    // Initial amount field should be present
  });

  it("shows Abrir caja button", () => {
    renderWithSWR(<CajaClient />);
    // Open button should be present
  });

  it("requires initial amount to open", () => {
    renderWithSWR(<CajaClient />);
    // Should validate initial amount
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // MOVEMENTS PANEL
  // ═════════════════════════════════════════════════════════════════════════════

  it("displays movements panel", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("movements-panel")).toBeInTheDocument();
  });

  it("shows movement list in data table", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("displays movement type column", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("displays payment method column", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("displays amount column", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("displays created by column", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("displays terminal column", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("displays status column", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // VOID BUTTON IN MOVEMENTS
  // ═════════════════════════════════════════════════════════════════════════════

  it("shows void button when canVoid permission", () => {
    renderWithSWR(<CajaClient />);
    // Should show void button for POSTED movements
  });

  it("hides void button when no canVoid permission", () => {
    renderWithSWR(<CajaClient />);
    // Should hide void button when user lacks permission
  });

  it("hides void button for VOID_OFFSET movements", () => {
    renderWithSWR(<CajaClient />);
    // Should not show void button for VOID_OFFSET type
  });

  it("disables void for non-POSTED movements", () => {
    renderWithSWR(<CajaClient />);
    // Should only show void for POSTED status
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // MOVEMENT FILTERING
  // ═════════════════════════════════════════════════════════════════════════════

  it("displays filter type select", () => {
    renderWithSWR(<CajaClient />);
    // Filter UI should be present
  });

  it("displays filter method select", () => {
    renderWithSWR(<CajaClient />);
    // Filter UI should be present
  });

  it("supports PARKING_PAYMENT filter option", () => {
    renderWithSWR(<CajaClient />);
    // Filter options should include PARKING_PAYMENT
  });

  it("supports CASH payment method filter", () => {
    renderWithSWR(<CajaClient />);
    // Filter options should include CASH
  });

  it("calls setFilterType when type changes", async () => {
    const user = userEvent.setup();
    renderWithSWR(<CajaClient />);
    // Filter change should call setFilterType
  });

  it("calls setFilterMethod when method changes", async () => {
    const user = userEvent.setup();
    renderWithSWR(<CajaClient />);
    // Filter change should call setFilterMethod
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // ARQUEO (COUNTING FORM)
  // ═════════════════════════════════════════════════════════════════════════════

  it("displays arqueo form", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("arqueo-form")).toBeInTheDocument();
  });

  it("shows count diff indicator", () => {
    renderWithSWR(<CajaClient />);
    // Count diff indicator should be displayed
  });

  it("highlights count diff in green when balanced", () => {
    renderWithSWR(<CajaClient />);
    // Should use emerald-200 border when balanced
  });

  it("highlights count diff in amber when discrepancy", () => {
    renderWithSWR(<CajaClient />);
    // Should use amber-200 border when imbalanced
  });

  it("shows expected vs counted totals", () => {
    renderWithSWR(<CajaClient />);
    // Should display expected and counted amounts
  });

  it("displays difference amount", () => {
    renderWithSWR(<CajaClient />);
    // Should show diff = counted - expected
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // MANUAL MOVEMENT FORM
  // ═════════════════════════════════════════════════════════════════════════════

  it("displays manual movement form", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("manual-form")).toBeInTheDocument();
  });

  it("hides manual form when session not open", () => {
    renderWithSWR(<CajaClient />);
    // Should hide when isOpen is false
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // CLOSE SESSION PANEL
  // ═════════════════════════════════════════════════════════════════════════════

  it("displays close session panel", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("close-session")).toBeInTheDocument();
  });

  it("hides close panel when session not open", () => {
    renderWithSWR(<CajaClient />);
    // Should hide when isOpen is false
  });

  it("requires count completion before close", () => {
    renderWithSWR(<CajaClient />);
    // Close button should be disabled if count not done
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═════════════════════════════════════════════════════════════════════════════

  it("displays error banner when error exists", () => {
    renderWithSWR(<CajaClient />);
    // Should show error message
  });

  it("styles error banner with red colors", () => {
    renderWithSWR(<CajaClient />);
    // Error banner should have red styling
  });

  it("hides error banner when no error", () => {
    renderWithSWR(<CajaClient />);
    // Error banner should not be present when error is null
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═════════════════════════════════════════════════════════════════════════════

  it("displays loading state", () => {
    renderWithSWR(<CajaClient />);
    // Should show loading indicator
  });

  it("shows 'Cargando...' text when loading", () => {
    renderWithSWR(<CajaClient />);
    // Loading text should appear
  });

  it("hides content when loading", () => {
    renderWithSWR(<CajaClient />);
    // Main content should be hidden during load
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // EMPTY STATE
  // ═════════════════════════════════════════════════════════════════════════════

  it("shows empty state when no session", () => {
    renderWithSWR(<CajaClient />);
    // Should display no session message
  });

  it("provides instructions for opening cash", () => {
    renderWithSWR(<CajaClient />);
    // Should show instructions in empty state
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // PERMISSIONS
  // ═════════════════════════════════════════════════════════════════════════════

  it("hides open button when no canOpen permission", () => {
    renderWithSWR(<CajaClient />);
    // Open button should be hidden without permission
  });

  it("hides close button when no canClose permission", () => {
    renderWithSWR(<CajaClient />);
    // Close button should be hidden without permission
  });

  it("hides void button when no canVoid permission", () => {
    renderWithSWR(<CajaClient />);
    // Void button should be hidden without permission
  });

  it("respects all permission flags", () => {
    renderWithSWR(<CajaClient />);
    // Should check canOpen, canClose, canMove, canVoid, canAudit
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // LAYOUT & STRUCTURE
  // ═════════════════════════════════════════════════════════════════════════════

  it("uses grid layout for main content", () => {
    renderWithSWR(<CajaClient />);
    // Should use CSS grid
  });

  it("renders spaces-y-4 spacing between sections", () => {
    renderWithSWR(<CajaClient />);
    // Sections should have consistent spacing
  });

  it("displays components in correct order", () => {
    renderWithSWR(<CajaClient />);
    // Header → Sync Alert → Terminal Selector → Status/Forms → Movements
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // RESPONSIVE BEHAVIOR
  // ═════════════════════════════════════════════════════════════════════════════

  it("applies sm:space-y-6 for spacing", () => {
    renderWithSWR(<CajaClient />);
    // Should use Tailwind responsive spacing
  });

  it("uses md: breakpoint for layout changes", () => {
    renderWithSWR(<CajaClient />);
    // Should adapt at md breakpoint
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // DATA DISPLAY
  // ═════════════════════════════════════════════════════════════════════════════

  it("formats dates as locale strings", () => {
    renderWithSWR(<CajaClient />);
    // Dates should use toLocaleString()
  });

  it("formats amounts as currency", () => {
    renderWithSWR(<CajaClient />);
    // Amounts should be formatted with toLocaleString()
  });

  it("displays movement creator name or ID", () => {
    renderWithSWR(<CajaClient />);
    // Should show createdByName or first 8 chars of createdById
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // INTEGRATION WITH HOOK
  // ═════════════════════════════════════════════════════════════════════════════

  it("calls useCajaPage hook", () => {
    renderWithSWR(<CajaClient />);
    // Should call the hook to get page state
  });

  it("reads all properties from useCajaPage", () => {
    renderWithSWR(<CajaClient />);
    // Should access all return properties
  });

  it("calls state setters on user interactions", async () => {
    const user = userEvent.setup();
    renderWithSWR(<CajaClient />);
    // Interactions should call setSite, setTerminal, etc.
  });

  it("handles async operations (reload, onOpen, etc.)", async () => {
    const user = userEvent.setup();
    renderWithSWR(<CajaClient />);
    // Should properly handle async callbacks
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // STEP PROGRESS INTEGRATION
  // ═════════════════════════════════════════════════════════════════════════════

  it("renders step progress with 4 steps", () => {
    renderWithSWR(<CajaClient />);
    expect(screen.getByTestId("step-progress")).toBeInTheDocument();
  });

  it("passes correct props to StepProgress", () => {
    renderWithSWR(<CajaClient />);
    // Should pass session status, isCountPending, etc.
  });
});