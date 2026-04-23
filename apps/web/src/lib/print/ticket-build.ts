import type { PrintDocumentType, TicketDocument, VehicleType } from "@parkflow/types";
import { resolvePrinterProfile, type TicketPrinterProfile } from "@parkflow/types";

export type OperationPayload = {
  sessionId?: string;
  receipt: {
    ticketNumber: string;
    plate: string;
    vehicleType?: VehicleType;
    site?: string | null;
    lane?: string | null;
    booth?: string | null;
    terminal?: string | null;
    entryAt?: string | null;
  };
};

export function resolvePaperWidthMmFromEnv(): 58 | 80 {
  const v = Number(process.env.NEXT_PUBLIC_PRINTER_PAPER_MM ?? 58);
  return v >= 80 ? 80 : 58;
}

export function resolvePrinterProfileFromEnv(): TicketPrinterProfile {
  const raw = process.env.NEXT_PUBLIC_PRINTER_PROFILE;
  const strict = (process.env.NEXT_PUBLIC_PRINTER_STRICT_MODE ?? "false").trim().toLowerCase() === "true";
  return resolvePrinterProfile(raw, { strict });
}

export function buildTicketDocument(
  payload: OperationPayload,
  options?: { operatorName?: string | null }
): TicketDocument {
  const receipt = payload.receipt;
  return {
    ticketId: payload.sessionId ?? receipt.ticketNumber,
    templateVersion: "ticket-layout-v1",
    paperWidthMm: resolvePaperWidthMmFromEnv(),
    ticketNumber: receipt.ticketNumber,
    parkingName: process.env.NEXT_PUBLIC_PARKING_NAME ?? "Parkflow",
    plate: receipt.plate,
    vehicleType: receipt.vehicleType ?? "CAR",
    site: receipt.site ?? null,
    lane: receipt.lane ?? null,
    booth: receipt.booth ?? null,
    terminal: receipt.terminal ?? null,
    operatorName: options?.operatorName ?? null,
    issuedAtIso: receipt.entryAt ?? new Date().toISOString(),
    legalMessage: process.env.NEXT_PUBLIC_TICKET_LEGAL_MESSAGE ?? null,
    qrPayload: `${process.env.NEXT_PUBLIC_TICKET_QR_PREFIX ?? "TICKET"}:${receipt.ticketNumber}`,
    barcodePayload: null,
    copyNumber: 1,
    printerProfile: resolvePrinterProfileFromEnv()
  };
}

export function ticketDocumentToJson(doc: TicketDocument): string {
  return JSON.stringify(doc);
}
