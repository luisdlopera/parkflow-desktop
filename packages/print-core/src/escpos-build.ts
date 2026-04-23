import type { PrintDocumentType, TicketDocument } from "@parkflow/types";
import { ticketTitleForDocument } from "@parkflow/types";
import type { EscPosProfileResolved } from "./escpos-profile";

function lineWidthChars(paperMm: number): number {
  return paperMm >= 80 ? 48 : 32;
}

function pushLineCentered(buf: number[], text: string, width: number): void {
  const t = text.trim();
  if (t.length <= width) {
    const pad = Math.floor((width - t.length) / 2);
    for (let i = 0; i < Math.min(pad, 24); i++) {
      buf.push(0x20);
    }
    for (let i = 0; i < t.length; i++) {
      buf.push(t.charCodeAt(i) & 0xff);
    }
    buf.push(0x0a);
    return;
  }
  for (let i = 0; i < t.length; i++) {
    buf.push(t.charCodeAt(i) & 0xff);
  }
  buf.push(0x0a);
}

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
 * ESC/POS bytes aligned with `apps/desktop/src-tauri/src/escpos.rs::build_receipt`.
 */
export function buildEscPosReceiptBytes(
  documentType: PrintDocumentType,
  ticket: TicketDocument,
  profile: EscPosProfileResolved
): Uint8Array {
  const paper = ticket.paperWidthMm ?? 58;
  const w = lineWidthChars(paper);
  const buf: number[] = [];
  buf.push(0x1b, 0x40, 0x1b, 0x61, 0x01);

  const title = ticketTitleForDocument(documentType);
  pushLineCentered(buf, title, w);
  buf.push(0x1b, 0x61, 0x00);
  pushLineCentered(buf, ticket.parkingName, w);
  buf.push(0x0a);
  pushLineCentered(buf, `No: ${ticket.ticketNumber}`, w);
  pushLineCentered(buf, `Placa: ${ticket.plate}`, w);
  pushLineCentered(buf, `Id: ${ticket.ticketId}`, w);
  if (ticket.templateVersion) {
    pushLineCentered(buf, `Tpl: ${ticket.templateVersion}`, w);
  }
  pushLineCentered(buf, `Fecha: ${ticket.issuedAtIso}`, w);
  if (ticket.operatorName) {
    pushLineCentered(buf, `Operador: ${ticket.operatorName}`, w);
  }
  if (ticket.site) {
    pushLineCentered(buf, `Sede: ${ticket.site}`, w);
  }
  if (ticket.lane) {
    pushLineCentered(buf, `Carril: ${ticket.lane}`, w);
  }
  if (ticket.booth) {
    pushLineCentered(buf, `Cabina: ${ticket.booth}`, w);
  }
  if (ticket.terminal) {
    pushLineCentered(buf, `Terminal: ${ticket.terminal}`, w);
  }
  if (ticket.copyNumber != null) {
    pushLineCentered(buf, `Copia: ${ticket.copyNumber}`, w);
  }
  if (ticket.legalMessage?.trim()) {
    buf.push(0x0a);
    const lines = ticket.legalMessage.split(/\r?\n/);
    for (const row of lines) {
      for (let i = 0; i < row.length; i++) {
        buf.push(row.charCodeAt(i) & 0xff);
      }
      buf.push(0x0a);
    }
  }
  if (ticket.qrPayload) {
    buf.push(0x0a);
    pushQrModel2(buf, ticket.qrPayload);
  } else if (ticket.barcodePayload) {
    buf.push(0x0a);
    const line = `Codigo: ${ticket.barcodePayload}\n`;
    for (let i = 0; i < line.length; i++) {
      buf.push(line.charCodeAt(i) & 0xff);
    }
  }
  buf.push(0x0a, 0x0a, 0x0a);
  for (let i = 0; i < profile.cutBytes.length; i++) {
    buf.push(profile.cutBytes[i]!);
  }
  return new Uint8Array(buf);
}
