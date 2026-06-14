import type { PrintDocumentType, TicketDocument, TicketPaperWidthMm } from "@parkflow/types";
import { buildTicketPreviewLines, buildTicketQrPayload } from "@parkflow/types";

/**
 * Single source: `TicketDocument` drives both plain-text preview and ESC/POS rendering.
 * Auto-generates a QR payload if none is provided so every ticket is scannable.
 */
export function previewLinesFromTicketDocument(
  documentKind: PrintDocumentType,
  doc: TicketDocument
): string[] {
  const qrPayload = doc.qrPayload ?? buildTicketQrPayload(doc);
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
    parkingSpaceCode: doc.parkingSpaceCode,
    copyNumber: doc.copyNumber,
    legalMessage: doc.legalMessage,
    qrPayload,
    barcodePayload: doc.barcodePayload,
    detailLines: doc.detailLines ?? null,
    price: doc.price,
    vehicleType: doc.vehicleType
  });
}
