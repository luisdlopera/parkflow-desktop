import type { PrintDocumentType, TicketDocument } from "@parkflow/types";
import {
  ticketTitleForDocument,
  formatDateNatural,
  formatTimeNatural,
  vehicleTypeLabel,
  buildTicketQrPayload,
} from "@parkflow/types";
import type { EscPosProfileResolved } from "./escpos-profile";

function lineWidthChars(paperMm: number): number {
  return paperMm >= 80 ? 48 : 32;
}

function lineWidthBigChars(paperMm: number, scale: number): number {
  return Math.floor(lineWidthChars(paperMm) / scale);
}

/** Push raw text bytes to buffer. */
function pushText(buf: number[], text: string): void {
  for (let i = 0; i < text.length; i++) {
    buf.push(text.charCodeAt(i) & 0xff);
  }
}

/** Push linefeed. */
function pushLF(buf: number[]): void {
  buf.push(0x0a);
}

/** Center alignment: ESC a 1 */
function setAlign(buf: number[], align: "left" | "center" | "right"): void {
  const mode = align === "center" ? 0x01 : align === "right" ? 0x02 : 0x00;
  buf.push(0x1b, 0x61, mode);
}

/** Select character size: GS ! n (bits 0-3=width, 4-7=height). */
function setCharSize(buf: number[], widthMul: number, heightMul: number): void {
  const n = ((widthMul - 1) & 0x0f) | (((heightMul - 1) & 0x0f) << 4);
  buf.push(0x1d, 0x21, n);
}

/** Reset to normal size. */
function resetCharSize(buf: number[]): void {
  buf.push(0x1d, 0x21, 0x00);
}

/** Bold: ESC ! (bit 3). Pass true/false. */
function setBold(buf: number[], on: boolean): void {
  if (on) {
    buf.push(0x1b, 0x21, 0x08);
  } else {
    buf.push(0x1b, 0x21, 0x00);
  }
}

/** Reset all print modes to normal. */
function resetModes(buf: number[]): void {
  buf.push(0x1b, 0x21, 0x00);
  buf.push(0x1d, 0x21, 0x00);
}

/** Push a centered line in current font/size. */
function pushLineCentered(buf: number[], text: string, width: number): void {
  const t = text.trim();
  if (t.length <= width) {
    const pad = Math.floor((width - t.length) / 2);
    for (let i = 0; i < Math.min(pad, 24); i++) {
      buf.push(0x20);
    }
    pushText(buf, t);
    pushLF(buf);
    return;
  }
  pushText(buf, t);
  pushLF(buf);
}

/** Push a visual separator line using '=' characters. */
function pushSeparatorLine(buf: number[], width: number): void {
  pushText(buf, "=".repeat(width));
  pushLF(buf);
}

/** Push QR code (Model 2). */
function pushQrModel2(buf: number[], data: string): void {
  const bytes = new TextEncoder().encode(data);
  if (bytes.length > 1800) {
    throw new Error("qr payload too large");
  }
  const storeLen = bytes.length + 3;
  const pL = storeLen & 0xff;
  const pH = (storeLen >> 8) & 0xff;
  buf.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
  buf.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
  for (let i = 0; i < bytes.length; i++) {
    buf.push(bytes[i]!);
  }
  buf.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
}

/**
 * ESC/POS bytes for human-friendly tickets.
 *
 * REDESIGNED (visual hierarchy + natural language):
 *   1. Title (centered, bold)
 *   2. Parking name (centered)
 *   3. Separator
 *   4. PLATE (HUGE, centered, 3x3 + bold)
 *   5. Separator
 *   6. Date (natural, 2x2 + bold)
 *   7. Time (natural, 2x2 + bold)
 *   8. Separator
 *   9. Price (HUGE, 3x3 + bold) — if present
 *  10. Separator
 *  11. Friendly metadata (left-aligned, normal)
 *  12. Separator
 *  13. QR code (centered) — preferred over barcode
 *  14. Separator
 *  15. Legal message (centered, normal)
 *  16. Detail lines
 *  17. Cut
 */
export function buildEscPosReceiptBytes(
  documentType: PrintDocumentType,
  ticket: TicketDocument,
  profile: EscPosProfileResolved
): Uint8Array {
  const paper = ticket.paperWidthMm ?? 58;
  const w = lineWidthChars(paper);
  const buf: number[] = [];

  // Initialize printer
  buf.push(0x1b, 0x40);

  // ── 1. TITLE ──
  setAlign(buf, "center");
  const title = ticketTitleForDocument(documentType);
  setBold(buf, true);
  pushText(buf, title);
  pushLF(buf);
  resetModes(buf);

  // ── 2. PARKING NAME ──
  pushLineCentered(buf, ticket.parkingName, w);
  pushLF(buf);

  // ── 3. SEPARATOR ──
  pushSeparatorLine(buf, w);

  // ── 4. PLATE (BIGGEST) ──
  setAlign(buf, "center");
  setBold(buf, true);
  pushText(buf, "PLACA");
  pushLF(buf);
  resetModes(buf);

  const plateScale = 3;
  const plateW = lineWidthBigChars(paper, plateScale);
  setAlign(buf, "center");
  setCharSize(buf, plateScale, plateScale);
  setBold(buf, true);
  pushLineCentered(buf, ticket.plate.toUpperCase(), plateW);
  resetModes(buf);
  pushLF(buf);

  // ── 5. SEPARATOR ──
  pushSeparatorLine(buf, w);

  // ── 6 & 7. DATE / TIME (natural language) ──
  const dateStr = formatDateNatural(ticket.issuedAtIso);
  const timeStr = formatTimeNatural(ticket.issuedAtIso);

  setAlign(buf, "center");
  setBold(buf, true);
  pushText(buf, "FECHA");
  pushLF(buf);
  resetModes(buf);

  setAlign(buf, "center");
  setCharSize(buf, 2, 2);
  setBold(buf, true);
  const dateW = lineWidthBigChars(paper, 2);
  pushLineCentered(buf, dateStr, dateW);
  resetModes(buf);
  pushLF(buf);

  setAlign(buf, "center");
  setBold(buf, true);
  pushText(buf, "HORA");
  pushLF(buf);
  resetModes(buf);

  setAlign(buf, "center");
  setCharSize(buf, 2, 2);
  setBold(buf, true);
  pushLineCentered(buf, timeStr, dateW);
  resetModes(buf);
  pushLF(buf);

  // ── 8. SEPARATOR ──
  pushSeparatorLine(buf, w);

  // ── 9. PRICE (if present) ──
  if (ticket.price) {
    setAlign(buf, "center");
    setBold(buf, true);
    pushText(buf, "TOTAL A PAGAR");
    pushLF(buf);
    resetModes(buf);

    setAlign(buf, "center");
    setCharSize(buf, plateScale, plateScale);
    setBold(buf, true);
    pushLineCentered(buf, ticket.price, plateW);
    resetModes(buf);
    pushLF(buf);

    // ── 10. SEPARATOR ──
    pushSeparatorLine(buf, w);
  }

  // ── 11. FRIENDLY METADATA (left-aligned, no technical jargon) ──
  setAlign(buf, "left");
  resetModes(buf);

  pushText(buf, `Numero: ${ticket.ticketNumber}`);
  pushLF(buf);

  if (ticket.vehicleType) {
    pushText(buf, `Vehiculo: ${vehicleTypeLabel(ticket.vehicleType)}`);
    pushLF(buf);
  }
  if (ticket.operatorName) {
    pushText(buf, `Atendido por: ${ticket.operatorName}`);
    pushLF(buf);
  }
  if (ticket.site) {
    pushText(buf, `Sede: ${ticket.site}`);
    pushLF(buf);
  }
  if (ticket.lane) {
    pushText(buf, `Carril: ${ticket.lane}`);
    pushLF(buf);
  }
  if (ticket.booth) {
    pushText(buf, `Cabina: ${ticket.booth}`);
    pushLF(buf);
  }
  if (ticket.parkingSpaceCode) {
    pushText(buf, `Celda: ${ticket.parkingSpaceCode}`);
    pushLF(buf);
  }
  if (ticket.copyNumber != null && ticket.copyNumber > 1) {
    pushText(buf, `Copia: ${ticket.copyNumber}`);
    pushLF(buf);
  }

  // ── 12. SEPARATOR ──
  pushSeparatorLine(buf, w);

  // ── 13. QR CODE (preferred) or BARCODE ──
  // Auto-generate QR payload if not provided, so every ticket gets a QR.
  const qrPayload = ticket.qrPayload ?? buildTicketQrPayload(ticket);
  if (qrPayload) {
    setAlign(buf, "center");
    setBold(buf, true);
    pushText(buf, "ESCANEA PARA SALIR");
    pushLF(buf);
    resetModes(buf);
    pushQrModel2(buf, qrPayload);
    pushLF(buf);
  } else if (ticket.barcodePayload) {
    setAlign(buf, "center");
    setBold(buf, true);
    pushText(buf, "CODIGO:");
    pushLF(buf);
    resetModes(buf);
    pushText(buf, ticket.barcodePayload);
    pushLF(buf);
  }

  // ── 14. SEPARATOR ──
  pushSeparatorLine(buf, w);

  // ── 15. LEGAL MESSAGE ──
  if (ticket.legalMessage?.trim()) {
    setAlign(buf, "center");
    resetModes(buf);
    const lines = ticket.legalMessage.split(/\r?\n/);
    for (const row of lines) {
      pushText(buf, row);
      pushLF(buf);
    }
    pushLF(buf);
  }

  // ── 16. DETAIL LINES (for exit/cash reports) ──
  if (ticket.detailLines?.length) {
    for (const line of ticket.detailLines) {
      pushText(buf, line);
      pushLF(buf);
    }
    pushLF(buf);
  }

  // ── 17. CUT ──
  pushLF(buf);
  pushLF(buf);
  pushLF(buf);
  for (let i = 0; i < profile.cutBytes.length; i++) {
    buf.push(profile.cutBytes[i]!);
  }

  return new Uint8Array(buf);
}
