import type { PrintDocumentType, TicketPaperWidthMm, TicketDocument, VehicleType } from "./contracts";

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

/** Map vehicle type enum to human-friendly Spanish label. */
export function vehicleTypeLabel(type: VehicleType): string {
  switch (type) {
    case "CAR": return "Carro";
    case "MOTORCYCLE": return "Moto";
    case "BICYCLE": return "Bicicleta";
    case "VAN": return "Camioneta";
    case "TRUCK": return "Camion";
    case "BUS": return "Bus";
    case "ELECTRIC": return "Electrico";
    case "OTHER": return "Otro";
    default: return type;
  }
}

/** Convert ISO date to natural language: "Domingo 14 de junio de 2026". */
export function formatDateNatural(isoString: string): string {
  const d = new Date(isoString);
  const fmt = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
  let text = fmt.format(d);
  // Ensure lowercase weekday/month and proper capitalization
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return text;
}

/** Convert ISO time to readable 12-hour format: "10:30 AM". */
export function formatTimeNatural(isoString: string): string {
  const d = new Date(isoString);
  const fmt = new Intl.DateTimeFormat("es-ES", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC"
  });
  return fmt.format(d).toUpperCase();
}

/** Build a compact JSON payload for the QR code so the exit scanner can load the ticket. */
export function buildTicketQrPayload(doc: TicketDocument): string {
  const payload = {
    ticketId: doc.ticketId,
    ticketNumber: doc.ticketNumber,
    plate: doc.plate,
    entryAt: doc.issuedAtIso
  };
  return JSON.stringify(payload);
}

function centerLine(text: string, width: number): string {
  const t = text.trim();
  if (t.length <= width) {
    const pad = Math.floor((width - t.length) / 2);
    return `${" ".repeat(Math.min(pad, 24))}${t}`;
  }
  return t;
}

function separatorLine(width: number): string {
  return "=".repeat(width);
}

/** Plain-text lines matching `escpos::build_receipt` layout (monospace preview).
 *
 * REDESIGNED for non-technical users:
 *   1. Title (centered)
 *   2. Parking name (centered)
 *   3. Separator
 *   4. PLATE (huge, centered)
 *   5. Separator
 *   6. Date (natural language, centered)
 *   7. Time (natural language, centered)
 *   8. Separator
 *   9. Price (huge, centered) — if present
 *  10. Separator
 *  11. Friendly metadata (left-aligned)
 *  12. Separator
 *  13. QR section
 *  14. Separator
 *  15. Legal message
 *  16. Detail lines
 */
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
  price?: string | null;
  vehicleType?: VehicleType | null;
}): string[] {
  const w = lineWidthChars(input.paperWidthMm);
  const lines: string[] = [];

  // ── 1. TITLE ──
  lines.push(centerLine(ticketTitleForDocument(input.documentKind), w));

  // ── 2. PARKING NAME ──
  lines.push(centerLine(input.parkingName, w));
  lines.push("");

  // ── 3. SEPARATOR ──
  lines.push(separatorLine(w));
  lines.push("");

  // ── 4. PLATE (HUGE) ──
  lines.push(centerLine("PLACA", w));
  lines.push(centerLine("████████████", w));
  lines.push(centerLine(input.plate.toUpperCase(), w));
  lines.push(centerLine("████████████", w));
  lines.push("");

  // ── 5. SEPARATOR ──
  lines.push(separatorLine(w));
  lines.push("");

  // ── 6 & 7. DATE / TIME in natural language ──
  const dateStr = formatDateNatural(input.issuedAtIso);
  const timeStr = formatTimeNatural(input.issuedAtIso);
  lines.push(centerLine("FECHA", w));
  lines.push(centerLine(`== ${dateStr} ==`, w));
  lines.push("");
  lines.push(centerLine("HORA", w));
  lines.push(centerLine(`== ${timeStr} ==`, w));
  lines.push("");

  // ── 8. SEPARATOR ──
  lines.push(separatorLine(w));
  lines.push("");

  // ── 9. PRICE (if present) ──
  if (input.price) {
    lines.push(centerLine("TOTAL A PAGAR", w));
    lines.push(centerLine("████████████", w));
    lines.push(centerLine(input.price, w));
    lines.push(centerLine("████████████", w));
    lines.push("");
    // ── 10. SEPARATOR ──
    lines.push(separatorLine(w));
    lines.push("");
  }

  // ── 11. FRIENDLY METADATA (left-aligned, human language) ──
  lines.push(`Numero: ${input.ticketNumber}`);
  if (input.vehicleType) {
    lines.push(`Vehiculo: ${vehicleTypeLabel(input.vehicleType)}`);
  }
  if (input.operatorName) {
    lines.push(`Atendido por: ${input.operatorName}`);
  }
  if (input.site) {
    lines.push(`Sede: ${input.site}`);
  }
  if (input.lane) {
    lines.push(`Carril: ${input.lane}`);
  }
  if (input.booth) {
    lines.push(`Cabina: ${input.booth}`);
  }
  if (input.parkingSpaceCode) {
    lines.push(`Celda: ${input.parkingSpaceCode}`);
  }
  if (input.copyNumber != null && input.copyNumber > 1) {
    lines.push(`Copia: ${input.copyNumber}`);
  }
  lines.push("");

  // ── 12. SEPARATOR ──
  lines.push(separatorLine(w));
  lines.push("");

  // ── 13. QR / BARCODE ──
  if (input.qrPayload) {
    lines.push(centerLine("ESCANEA PARA SALIR", w));
    lines.push(centerLine("[CODIGO QR]", w));
  } else if (input.barcodePayload) {
    lines.push(centerLine("CODIGO:", w));
    lines.push(centerLine(`| ${input.barcodePayload} |`, w));
  }
  lines.push("");

  // ── 14. SEPARATOR ──
  lines.push(separatorLine(w));
  lines.push("");

  // ── 15. LEGAL MESSAGE ──
  if (input.legalMessage?.trim()) {
    lines.push(...input.legalMessage.split(/\r?\n/));
    lines.push("");
  }

  // ── 16. DETAIL LINES ──
  if (input.detailLines?.length) {
    lines.push(...input.detailLines);
    lines.push("");
  }

  lines.push("", "", "", "--- corte ---");
  return lines;
}
