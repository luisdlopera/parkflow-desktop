import type { PrintDocumentType, TicketPaperWidthMm } from "./contracts";

export function lineWidthChars(paperWidthMm: TicketPaperWidthMm): number {
  return paperWidthMm >= 80 ? 48 : 32;
}

export function ticketTitleForDocument(kind: PrintDocumentType): string {
  switch (kind) {
    case "ENTRY":
      return "ENTRADA";
    case "EXIT":
      return "SALIDA";
    case "REPRINT":
      return "REIMPRESION";
    case "LOST_TICKET":
      return "TIQUETE PERDIDO";
    case "CASH_CLOSING":
      return "CIERRE DE CAJA";
    case "CASH_MOVEMENT":
      return "MOVIMIENTO CAJA";
    case "CASH_COUNT":
      return "ARQUEO DE CAJA";
    default:
      return "PARQUEADERO";
  }
}

function centerLine(text: string, width: number): string {
  const t = text.trim();
  if (t.length <= width) {
    const pad = Math.floor((width - t.length) / 2);
    return `${" ".repeat(Math.min(pad, 24))}${t}`;
  }
  return t;
}

/** Plain-text lines matching `escpos::build_receipt` layout (monospace preview). */
export function buildTicketPreviewLines(input: {
  documentKind: PrintDocumentType;
  paperWidthMm: TicketPaperWidthMm;
  ticketNumber: string;
  parkingName: string;
  plate: string;
  ticketId: string;
  templateVersion?: string | null;
  issuedAtIso: string;
  operatorName?: string | null;
  site?: string | null;
  lane?: string | null;
  booth?: string | null;
  terminal?: string | null;
  copyNumber?: number | null;
  legalMessage?: string | null;
  qrPayload?: string | null;
  barcodePayload?: string | null;
  detailLines?: string[] | null;
}): string[] {
  const w = lineWidthChars(input.paperWidthMm);
  const lines: string[] = [];
  lines.push(centerLine(ticketTitleForDocument(input.documentKind), w));
  lines.push(centerLine(input.parkingName, w));
  lines.push("");
  lines.push(centerLine(`No: ${input.ticketNumber}`, w));
  lines.push(centerLine(`Placa: ${input.plate}`, w));
  lines.push(centerLine(`Id: ${input.ticketId}`, w));
  if (input.templateVersion) {
    lines.push(centerLine(`Tpl: ${input.templateVersion}`, w));
  }
  lines.push(centerLine(`Fecha: ${input.issuedAtIso}`, w));
  if (input.operatorName) {
    lines.push(centerLine(`Operador: ${input.operatorName}`, w));
  }
  if (input.site) {
    lines.push(centerLine(`Sede: ${input.site}`, w));
  }
  if (input.lane) {
    lines.push(centerLine(`Carril: ${input.lane}`, w));
  }
  if (input.booth) {
    lines.push(centerLine(`Cabina: ${input.booth}`, w));
  }
  if (input.terminal) {
    lines.push(centerLine(`Terminal: ${input.terminal}`, w));
  }
  if (input.copyNumber != null) {
    lines.push(centerLine(`Copia: ${input.copyNumber}`, w));
  }
  if (input.legalMessage?.trim()) {
    lines.push("");
    for (const row of input.legalMessage.split(/\r?\n/)) {
      lines.push(row);
    }
    lines.push("");
  }
  if (input.qrPayload) {
    lines.push("");
    lines.push(`[QR] ${input.qrPayload}`);
  } else   if (input.barcodePayload) {
    lines.push("");
    lines.push(`Codigo: ${input.barcodePayload}`);
  }
  if (input.detailLines?.length) {
    lines.push("");
    for (const row of input.detailLines) {
      lines.push(row);
    }
  }
  lines.push("");
  lines.push("");
  lines.push("");
  lines.push("--- corte ---");
  return lines;
}
