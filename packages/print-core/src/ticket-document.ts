import type { PrintDocumentType, TicketDocument, TicketPaperWidthMm } from "@parkflow/types";
import { buildTicketPreviewLines } from "@parkflow/types";

/**
 * Single source: `TicketDocument` drives both plain-text preview and ESC/POS rendering.
 */
export function previewLinesFromTicketDocument(
  documentKind: PrintDocumentType,
  doc: TicketDocument
): string[] {
  return buildTicketPreviewLines({
    documentKind,
    paperWidthMm: (doc.paperWidthMm ?? 58) as TicketPaperWidthMm,
    ticketNumber: doc.ticketNumber,
    parkingName: doc.parkingName,
    plate: doc.plate,
    ticketId: doc.ticketId,
    templateVersion: doc.templateVersion,
    issuedAtIso: doc.issuedAtIso,
    operatorName: doc.operatorName,
    site: doc.site,
    lane: doc.lane,
    booth: doc.booth,
    terminal: doc.terminal,
    copyNumber: doc.copyNumber,
    legalMessage: doc.legalMessage,
    qrPayload: doc.qrPayload,
    barcodePayload: doc.barcodePayload,
    detailLines: doc.detailLines ?? null
  });
}
