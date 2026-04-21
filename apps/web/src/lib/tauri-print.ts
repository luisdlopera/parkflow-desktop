"use client";

type PrintDocumentType = "ENTRY" | "EXIT" | "REPRINT" | "LOST_TICKET";

type ReceiptPayload = {
  ticketNumber: string;
  plate: string;
  site?: string | null;
  lane?: string | null;
  booth?: string | null;
  terminal?: string | null;
  entryAt?: string | null;
};

type OperationPayload = {
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

function toTicketJson(payload: OperationPayload): string {
  const receipt = payload.receipt;
  return JSON.stringify({
    ticketId: payload.sessionId ?? receipt.ticketNumber,
    templateVersion: "ticket-layout-v1",
    paperWidthMm: Number(process.env.NEXT_PUBLIC_PRINTER_PAPER_MM ?? 58),
    ticketNumber: receipt.ticketNumber,
    parkingName: process.env.NEXT_PUBLIC_PARKING_NAME ?? "Parkflow",
    plate: receipt.plate,
    site: receipt.site ?? null,
    lane: receipt.lane ?? null,
    booth: receipt.booth ?? null,
    terminal: receipt.terminal ?? null,
    operatorName: null,
    issuedAtIso: receipt.entryAt ?? new Date().toISOString(),
    legalMessage: process.env.NEXT_PUBLIC_TICKET_LEGAL_MESSAGE ?? null,
    qrPayload: `${process.env.NEXT_PUBLIC_TICKET_QR_PREFIX ?? "TICKET"}:${receipt.ticketNumber}`,
    barcodePayload: null,
    copyNumber: 1
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
    return "Ticket enviado, pero la impresora no confirmo estado de hardware.";
  }

  return null;
}
