"use client";

import type { TicketDocument } from "@parkflow/types";
import { resolvePaperWidthMmFromEnv, resolvePrinterProfileFromEnv } from "@/lib/print/ticket-build";
import type { CashMovementDto, CashSessionDto, CashSummaryDto } from "@/lib/cash/cash-api";

export function buildCashMovementTicket(
  session: CashSessionDto,
  movement: CashMovementDto,
  parkingName: string
): TicketDocument {
  const registrar =
    movement.createdByName ?? `Usuario ${movement.createdById.slice(0, 8)}`;
  const lines = [
    `Tipo: ${movement.movementType}`,
    `Medio: ${movement.paymentMethod}`,
    `Valor: ${movement.amount}`,
    movement.reason ? `Motivo: ${movement.reason}` : "",
    movement.terminal ? `Equipo/terminal: ${movement.terminal}` : "",
    `Registra: ${registrar}`,
    `Sesion caja: ${session.id}`,
    `Estado: ${movement.status}`
  ].filter(Boolean);

  return {
    ticketId: movement.id,
    templateVersion: "ticket-layout-v1",
    paperWidthMm: resolvePaperWidthMmFromEnv(),
    ticketNumber: `MOV-${movement.id.slice(0, 8)}`,
    parkingName,
    plate: "CAJA",
    vehicleType: "OTHER",
    site: session.register.site,
    lane: null,
    booth: null,
    terminal: session.register.terminal,
    operatorName: movement.createdByName ?? null,
    issuedAtIso: movement.createdAt,
    legalMessage: null,
    qrPayload: null,
    barcodePayload: movement.id,
    copyNumber: 1,
    printerProfile: resolvePrinterProfileFromEnv(),
    detailLines: lines
  };
}

export function buildCashCountTicket(
  session: CashSessionDto,
  summary: CashSummaryDto,
  parkingName: string
): TicketDocument {
  const lines = [
    "ARQUEO DE CAJA",
    `Efectivo declarado: ${session.countCash ?? 0}`,
    `Tarjetas: ${session.countCard ?? 0}`,
    `Transferencias: ${session.countTransfer ?? 0}`,
    `Otros: ${session.countOther ?? 0}`,
    `Contado total: ${session.countedAmount ?? 0}`,
    `Esperado libro: ${summary.expectedLedgerTotal}`,
    `Diferencia: ${session.differenceAmount ?? 0}`
  ];

  return {
    ticketId: `count-${session.id}`,
    templateVersion: "ticket-layout-v1",
    paperWidthMm: resolvePaperWidthMmFromEnv(),
    ticketNumber: `ARQ-${session.id.slice(0, 8)}`,
    parkingName,
    plate: "CAJA",
    vehicleType: "OTHER",
    site: session.register.site,
    lane: null,
    booth: null,
    terminal: session.register.terminal,
    operatorName: null,
    issuedAtIso: session.countedAt ?? new Date().toISOString(),
    legalMessage: null,
    qrPayload: null,
    barcodePayload: session.id,
    copyNumber: 1,
    printerProfile: resolvePrinterProfileFromEnv(),
    detailLines: lines
  };
}
