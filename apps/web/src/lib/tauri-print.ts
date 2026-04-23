"use client";

import type {
  PrintDocumentType,
  TicketPaperWidthMm,
  VehicleType
} from "@parkflow/types";
import {
  buildTicketPreviewLines,
  DEFAULT_PRINTER_PROFILE,
  parsePrinterProfile,
  resolvePrinterProfile as resolvePrinterProfileValue,
  type TicketPrinterProfile
} from "@parkflow/types";

type ReceiptPayload = {
  ticketNumber: string;
  plate: string;
  vehicleType?: VehicleType;
  site?: string | null;
  lane?: string | null;
  booth?: string | null;
  terminal?: string | null;
  entryAt?: string | null;
};

export type OperationPayload = {
  sessionId?: string;
  receipt: ReceiptPayload;
};

type PrinterConnection =
  | { type: "tcp"; host: string; port: number }
  | { type: "serial"; path: string; baud_rate: number };

function getPrinterConnection(): PrinterConnection {
  const type = (process.env.NEXT_PUBLIC_PRINTER_CONNECTION_TYPE ?? "tcp").toLowerCase();
  if (type === "serial") {
    return {
      type: "serial",
      path: process.env.NEXT_PUBLIC_PRINTER_SERIAL_PATH ?? "COM3",
      baud_rate: Number(process.env.NEXT_PUBLIC_PRINTER_BAUD_RATE ?? 9600)
    };
  }

  return {
    type: "tcp",
    host: process.env.NEXT_PUBLIC_PRINTER_TCP_HOST ?? "127.0.0.1",
    port: Number(process.env.NEXT_PUBLIC_PRINTER_TCP_PORT ?? 9100)
  };
}

export function resolvePaperWidthMm(): TicketPaperWidthMm {
  const v = Number(process.env.NEXT_PUBLIC_PRINTER_PAPER_MM ?? 58);
  return v >= 80 ? 80 : 58;
}

export function resolvePrinterProfile(): TicketPrinterProfile {
  const raw = process.env.NEXT_PUBLIC_PRINTER_PROFILE;
  const strict = (process.env.NEXT_PUBLIC_PRINTER_STRICT_MODE ?? "false").trim().toLowerCase() === "true";
  const parsed = parsePrinterProfile(raw);

  if (!parsed && raw && raw.trim()) {
    console.warn(`Unknown printer profile "${raw}". Using ${DEFAULT_PRINTER_PROFILE}.`);
  }

  return resolvePrinterProfileValue(raw, { strict });
}

export function buildTicketPreviewForOperation(
  payload: OperationPayload,
  documentType: PrintDocumentType
): string[] {
  const receipt = payload.receipt;
  const paperWidthMm = resolvePaperWidthMm();
  const ticketId = payload.sessionId ?? receipt.ticketNumber;
  return buildTicketPreviewLines({
    documentKind: documentType,
    paperWidthMm,
    ticketNumber: receipt.ticketNumber,
    parkingName: process.env.NEXT_PUBLIC_PARKING_NAME ?? "Parkflow",
    plate: receipt.plate,
    ticketId,
    templateVersion: "ticket-layout-v1",
    issuedAtIso: receipt.entryAt ?? new Date().toISOString(),
    operatorName: null,
    site: receipt.site ?? null,
    lane: receipt.lane ?? null,
    booth: receipt.booth ?? null,
    terminal: receipt.terminal ?? null,
    copyNumber: 1,
    legalMessage: process.env.NEXT_PUBLIC_TICKET_LEGAL_MESSAGE ?? null,
    qrPayload: `${process.env.NEXT_PUBLIC_TICKET_QR_PREFIX ?? "TICKET"}:${receipt.ticketNumber}`,
    barcodePayload: null
  });
}

function toTicketJson(payload: OperationPayload): string {
  const receipt = payload.receipt;
  return JSON.stringify({
    ticketId: payload.sessionId ?? receipt.ticketNumber,
    templateVersion: "ticket-layout-v1",
    paperWidthMm: resolvePaperWidthMm(),
    ticketNumber: receipt.ticketNumber,
    parkingName: process.env.NEXT_PUBLIC_PARKING_NAME ?? "Parkflow",
    plate: receipt.plate,
    vehicleType: receipt.vehicleType ?? "CAR",
    site: receipt.site ?? null,
    lane: receipt.lane ?? null,
    booth: receipt.booth ?? null,
    terminal: receipt.terminal ?? null,
    operatorName: null,
    issuedAtIso: receipt.entryAt ?? new Date().toISOString(),
    legalMessage: process.env.NEXT_PUBLIC_TICKET_LEGAL_MESSAGE ?? null,
    qrPayload: `${process.env.NEXT_PUBLIC_TICKET_QR_PREFIX ?? "TICKET"}:${receipt.ticketNumber}`,
    barcodePayload: null,
    copyNumber: 1,
    printerProfile: resolvePrinterProfile()
  });
}

export async function printReceiptIfTauri(
  payload: OperationPayload,
  documentType: PrintDocumentType
): Promise<string | null> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return null;
  }

  const { invoke } = await import("@tauri-apps/api/core");
  const result = await invoke<{
    hardware_confirmed: boolean;
    status_byte?: number | null;
    status_hint?: string | null;
    error?: string | null;
  }>("print_escpos_ticket", {
    connection: getPrinterConnection(),
    documentType,
    ticketJson: toTicketJson(payload)
  });

  if (result.error) {
    throw new Error(result.error);
  }

  if (!result.hardware_confirmed) {
    if (result.status_hint === "paper_end_detected") {
      return "Impresora sin papel o sensor en fin de papel; no se confirma impresion.";
    }
    if (result.status_byte == null) {
      return "Ticket enviado, pero la impresora no respondio al estado (no se confirma hardware).";
    }
    return "La impresora respondio pero no paso verificacion de listo (revisar papel/cubierta).";
  }

  return null;
}
