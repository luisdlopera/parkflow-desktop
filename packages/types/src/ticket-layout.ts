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
  parkingSpaceCode?: string | null;
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

  const metadataFields = [
    { value: input.templateVersion, format: (val: string) => `Tpl: ${val}` },
    { value: input.issuedAtIso, format: (val: string) => `Fecha: ${val}` },
    { value: input.operatorName, format: (val: string) => `Operador: ${val}` },
    { value: input.site, format: (val: string) => `Sede: ${val}` },
    { value: input.lane, format: (val: string) => `Carril: ${val}` },
    { value: input.booth, format: (val: string) => `Cabina: ${val}` },
    { value: input.terminal, format: (val: string) => `Terminal: ${val}` },
    { value: input.parkingSpaceCode, format: (val: string) => `Celda: ${val}` },
    { value: input.copyNumber != null ? String(input.copyNumber) : null, format: (val: string) => `Copia: ${val}` }
  ];

  for (const field of metadataFields) {
    if (field.value) {
      lines.push(centerLine(field.format(field.value), w));
    }
  }

  if (input.legalMessage?.trim()) {
    lines.push("", ...input.legalMessage.split(/\r?\n/), "");
  }
  if (input.qrPayload) {
    lines.push("", `[QR] ${input.qrPayload}`);
  } else if (input.barcodePayload) {
    lines.push("", `Codigo: ${input.barcodePayload}`);
  }
  if (input.detailLines?.length) {
    lines.push("", ...input.detailLines);
  }
  lines.push("", "", "", "--- corte ---");
  return lines;
}
