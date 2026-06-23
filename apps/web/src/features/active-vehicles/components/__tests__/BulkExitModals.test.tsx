import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BulkExitConfirmModal, BulkExitSuccessModal } from "../BulkExitModals";
import type { BulkExitCalculateResponseDto, BulkExitResponseDto } from "@/lib/api/bulk-exit-api";

vi.mock("@/components/bridge/Button", () => ({
  Button: ({ children, onPress, isLoading, isDisabled, disabled }: any) => (
    <button onClick={onPress} disabled={isLoading || isDisabled || disabled} data-testid="bridge-button">
      {isLoading ? "Procesando..." : children}
    </button>
  ),
}));

vi.mock("@heroui/react", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    ListBox: Object.assign(({ children }: any) => React.createElement("div", { "data-testid": "listbox" }, children), {
      Item: ({ children }: any) => React.createElement("div", null, children),
    }),
    Modal: Object.assign(
      ({ children }: any) => React.createElement("div", { "data-testid": "modal" }, children),
      {
        Backdrop: ({ children, isOpen }: any) =>
          isOpen ? React.createElement("div", { "data-testid": "modal-backdrop" }, children) : null,
        Container: ({ children }: any) => React.createElement("div", { "data-testid": "modal-container" }, children),
        Dialog: ({ children }: any) => React.createElement("div", { "data-testid": "modal-dialog" }, children),
        CloseTrigger: () => React.createElement("button", { "data-testid": "modal-close" }),
        Header: ({ children }: any) => React.createElement("div", { "data-testid": "modal-header" }, children),
        Heading: ({ children }: any) => React.createElement("h2", { "data-testid": "modal-heading" }, children),
        Body: ({ children }: any) => React.createElement("div", { "data-testid": "modal-body" }, children),
        Footer: ({ children }: any) => React.createElement("div", { "data-testid": "modal-footer" }, children),
      },
    ),
    Badge: ({ children, content }: any) => React.createElement("span", { "data-testid": "badge" }, content ?? children),
  };
});

const precalculation: BulkExitCalculateResponseDto = {
  totalSubtotal: 30000,
  totalSurcharge: 0,
  totalDiscount: 5000,
  finalTotal: 25000,
  totalVehicles: 3,
  items: [
    { locator: "loc-1", plate: "ABC123", ticketNumber: "TK-001", subtotal: 10000, discount: 2000, total: 8000, errorMessage: null },
    { locator: "loc-2", plate: "DEF456", ticketNumber: "TK-002", subtotal: 10000, discount: 2000, total: 8000, errorMessage: null },
    { locator: "loc-3", plate: "GHI789", ticketNumber: "TK-003", subtotal: 10000, discount: 1000, total: 9000, errorMessage: "Sin tarifa" },
  ],
  errors: ["GHI789 no tiene tarifa asignada"],
};

const paymentMethods = [
  { code: "CASH", label: "Efectivo" },
  { code: "CARD", label: "Tarjeta" },
];

describe("BulkExitConfirmModal", () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const setSelectedPaymentMethod = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders step indicators and summary cards", () => {
    render(
      <BulkExitConfirmModal
        precalculation={precalculation}
        isProcessing={false}
        availablePaymentMethods={paymentMethods}
        selectedPaymentMethod="CASH"
        setSelectedPaymentMethod={setSelectedPaymentMethod}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("Confirmar Salida Masiva")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("$30,000")).toBeInTheDocument();
    expect(screen.getByText("-$5,000")).toBeInTheDocument();
    expect(screen.getByText("$25,000")).toBeInTheDocument();
  });

  it("shows precalculation errors when present", () => {
    render(
      <BulkExitConfirmModal
        precalculation={precalculation}
        isProcessing={false}
        availablePaymentMethods={paymentMethods}
        selectedPaymentMethod="CASH"
        setSelectedPaymentMethod={setSelectedPaymentMethod}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText(/GHI789 no tiene tarifa asignada/)).toBeInTheDocument();
    expect(screen.getByText("Vehículos con anomalías (se excluirán/fallarán):")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is pressed", async () => {
    const user = userEvent.setup();
    render(
      <BulkExitConfirmModal
        precalculation={precalculation}
        isProcessing={false}
        availablePaymentMethods={paymentMethods}
        selectedPaymentMethod="CASH"
        setSelectedPaymentMethod={setSelectedPaymentMethod}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByText("Confirmar e Imprimir"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button is pressed", async () => {
    const user = userEvent.setup();
    render(
      <BulkExitConfirmModal
        precalculation={precalculation}
        isProcessing={false}
        availablePaymentMethods={paymentMethods}
        selectedPaymentMethod="CASH"
        setSelectedPaymentMethod={setSelectedPaymentMethod}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByText("Cancelar"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables buttons while processing", () => {
    render(
      <BulkExitConfirmModal
        precalculation={precalculation}
        isProcessing={true}
        availablePaymentMethods={paymentMethods}
        selectedPaymentMethod="CASH"
        setSelectedPaymentMethod={setSelectedPaymentMethod}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("Procesando...")).toBeDisabled();
    expect(screen.getByText("Cancelar")).not.toBeDisabled();
  });

  it("renders item rows with error and ok status", () => {
    render(
      <BulkExitConfirmModal
        precalculation={precalculation}
        isProcessing={false}
        availablePaymentMethods={paymentMethods}
        selectedPaymentMethod="CASH"
        setSelectedPaymentMethod={setSelectedPaymentMethod}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("ABC123")).toBeInTheDocument();
    expect(screen.getByText("DEF456")).toBeInTheDocument();
    expect(screen.getByText("GHI789")).toBeInTheDocument();
    expect(screen.getByText("TK-001")).toBeInTheDocument();
  });
});

describe("BulkExitSuccessModal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders success state when no failures", () => {
    const result: BulkExitResponseDto = {
      totalCharged: 25000,
      successfulCount: 3,
      failedCount: 0,
      successfulReceipts: [],
      errors: [],
    };

    render(<BulkExitSuccessModal result={result} onClose={onClose} />);
    expect(screen.getByText("Proceso Exitoso")).toBeInTheDocument();
    expect(screen.getByText("$25,000")).toBeInTheDocument();
    expect(screen.getByText(/se procesaron/i)).toBeInTheDocument();
  });

  it("renders partial state when there are failures", () => {
    const result: BulkExitResponseDto = {
      totalCharged: 16000,
      successfulCount: 2,
      failedCount: 1,
      successfulReceipts: [],
      errors: ["GHI789 falló"],
    };

    render(<BulkExitSuccessModal result={result} onClose={onClose} />);
    expect(screen.getByText("Proceso Parcial")).toBeInTheDocument();
    expect(screen.getByText(/1 fallaron/)).toBeInTheDocument();
  });

  it("calls onClose when close button is pressed", async () => {
    const user = userEvent.setup();
    const result: BulkExitResponseDto = {
      totalCharged: 25000,
      successfulCount: 3,
      failedCount: 0,
      successfulReceipts: [],
      errors: [],
    };

    render(<BulkExitSuccessModal result={result} onClose={onClose} />);
    await user.click(screen.getByText("Cerrar"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
