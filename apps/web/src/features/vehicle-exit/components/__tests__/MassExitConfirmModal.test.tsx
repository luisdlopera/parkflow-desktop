import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MassExitConfirmModal } from "../MassExitConfirmModal";
import type { MassExitPreviewResponseDto } from "@/lib/api/mass-exit-api";

const preview: MassExitPreviewResponseDto = {
  totalCandidates: 5,
  estimatedTotal: 40000,
  items: [
    {
      ticketNumber: "TK-001",
      plate: "ABC123",
      vehicleType: "AUTO",
      site: "SEDE-A",
      entryAt: "2026-06-22T08:00:00Z",
      status: "SUCCESS",
      amountCharged: 10000,
      errorMessage: null,
    },
    {
      ticketNumber: "TK-002",
      plate: "DEF456",
      vehicleType: "MOTO",
      site: "SEDE-A",
      entryAt: "2026-06-22T09:00:00Z",
      status: "SUCCESS",
      amountCharged: 8000,
      errorMessage: null,
    },
    {
      ticketNumber: "TK-003",
      plate: "GHI789",
      vehicleType: "AUTO",
      site: "SEDE-B",
      entryAt: "2026-06-22T10:00:00Z",
      status: "SKIPPED",
      amountCharged: 0,
      errorMessage: "Placa no encontrada",
    },
  ],
  warnings: ["GHI789 no se procesará por datos incompletos"],
};

vi.mock("@/components/bridge/Modal", () => {
  const React = require("react");
  const Modal = ({ children }: any) =>
    React.createElement("div", { "data-testid": "modal" }, children);
  Modal.Header = ({ children }: any) =>
    React.createElement("div", { "data-testid": "modal-header" }, children);
  Modal.Body = ({ children }: any) =>
    React.createElement("div", { "data-testid": "modal-body" }, children);
  Modal.Footer = ({ children }: any) =>
    React.createElement("div", { "data-testid": "modal-footer" }, children);
  return { Modal };
});

vi.mock("@/components/bridge/Button", () => ({
  Button: ({ children, onPress, isLoading, isDisabled, startContent }: any) => (
    <button onClick={onPress} disabled={isDisabled || isLoading} data-testid="mock-button">
      {startContent}
      {isLoading ? "Procesando..." : children}
    </button>
  ),
}));

describe("MassExitConfirmModal", () => {
  const handleConfirm = vi.fn();
  const reset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders step indicator and summary cards", () => {
    render(
      <MassExitConfirmModal
        preview={preview}
        reason="Cierre de operación"
        chargeMode="NORMAL"
        isProcessing={false}
        processError={null}
        handleConfirm={handleConfirm}
        reset={reset}
      />,
    );

    expect(screen.getByText("Paso 2")).toBeInTheDocument();
    expect(screen.getByText("Confirmar Salida Masiva")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows estimated total", () => {
    render(
      <MassExitConfirmModal
        preview={preview}
        reason="Cierre de operación"
        chargeMode="NORMAL"
        isProcessing={false}
        processError={null}
        handleConfirm={handleConfirm}
        reset={reset}
      />,
    );

    expect(screen.getByText("$ 40.000")).toBeInTheDocument();
  });

  it("shows warnings when present", () => {
    render(
      <MassExitConfirmModal
        preview={preview}
        reason="Cierre de operación"
        chargeMode="NORMAL"
        isProcessing={false}
        processError={null}
        handleConfirm={handleConfirm}
        reset={reset}
      />,
    );

    expect(screen.getByText(/1 advertencia/)).toBeInTheDocument();
  });

  it("renders vehicle list with plates and tickets", () => {
    render(
      <MassExitConfirmModal
        preview={preview}
        reason="Cierre de operación"
        chargeMode="NORMAL"
        isProcessing={false}
        processError={null}
        handleConfirm={handleConfirm}
        reset={reset}
      />,
    );

    expect(screen.getByText("ABC123")).toBeInTheDocument();
    expect(screen.getByText("DEF456")).toBeInTheDocument();
    expect(screen.getByText("TK-001")).toBeInTheDocument();
    expect(screen.getByText("TK-002")).toBeInTheDocument();
  });

  it("shows SKIPPED badge for skipped vehicles", () => {
    render(
      <MassExitConfirmModal
        preview={preview}
        reason="Cierre de operación"
        chargeMode="NORMAL"
        isProcessing={false}
        processError={null}
        handleConfirm={handleConfirm}
        reset={reset}
      />,
    );

    const skippedBadges = screen.getAllByText("Omitido");
    expect(skippedBadges.length).toBeGreaterThan(0);
  });

  it("shows irreversible warning", () => {
    render(
      <MassExitConfirmModal
        preview={preview}
        reason="Cierre de operación"
        chargeMode="NORMAL"
        isProcessing={false}
        processError={null}
        handleConfirm={handleConfirm}
        reset={reset}
      />,
    );

    expect(screen.getByText("Operación irreversible")).toBeInTheDocument();
  });

  it("disables confirm when reason is empty", () => {
    render(
      <MassExitConfirmModal
        preview={preview}
        reason=""
        chargeMode="NORMAL"
        isProcessing={false}
        processError={null}
        handleConfirm={handleConfirm}
        reset={reset}
      />,
    );

    const confirmBtn = screen.getByText(/Confirmar salida/);
    expect(confirmBtn).toBeDisabled();
  });

  it("calls handleConfirm when confirm is pressed with valid reason", async () => {
    const user = userEvent.setup();
    render(
      <MassExitConfirmModal
        preview={preview}
        reason="Cierre de operación"
        chargeMode="NORMAL"
        isProcessing={false}
        processError={null}
        handleConfirm={handleConfirm}
        reset={reset}
      />,
    );

    const confirmBtn = screen.getByText(/Confirmar salida/);
    expect(confirmBtn).not.toBeDisabled();
    await user.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows process error when present", () => {
    render(
      <MassExitConfirmModal
        preview={preview}
        reason="Cierre de operación"
        chargeMode="NORMAL"
        isProcessing={false}
        processError="No hay conexión con el servidor"
        handleConfirm={handleConfirm}
        reset={reset}
      />,
    );

    expect(screen.getByText("No hay conexión con el servidor")).toBeInTheDocument();
  });

  it("shows charge mode FREE as $0 total", () => {
    render(
      <MassExitConfirmModal
        preview={preview}
        reason="Exoneración"
        chargeMode="FREE"
        isProcessing={false}
        processError={null}
        handleConfirm={handleConfirm}
        reset={reset}
      />,
    );

    const zeroAmounts = screen.getAllByText("$0");
    expect(zeroAmounts.length).toBeGreaterThanOrEqual(1);
  });
});
