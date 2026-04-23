"use client";

import { previewLinesFromTicketDocument } from "@parkflow/print-core";
import type { PrintDocumentType } from "@parkflow/types";
import { printThermalReceipt } from "@/lib/print/print-service";
import {
  buildTicketDocument,
  resolvePaperWidthMmFromEnv,
  resolvePrinterProfileFromEnv,
  type OperationPayload
} from "@/lib/print/ticket-build";

export type { OperationPayload };

export function resolvePaperWidthMm(): import("@parkflow/types").TicketPaperWidthMm {
  return resolvePaperWidthMmFromEnv();
}

export function resolvePrinterProfile() {
  return resolvePrinterProfileFromEnv();
}

export function buildTicketPreviewForOperation(
  payload: OperationPayload,
  documentType: PrintDocumentType
): string[] {
  const doc = buildTicketDocument(payload);
  return previewLinesFromTicketDocument(documentType, doc);
}

/**
 * Impresión térmica: prioriza Print Agent local (`NEXT_PUBLIC_PRINT_AGENT_URL`), luego Tauri, luego cola offline.
 * Compatibilidad: devuelve el mismo `string | null` de aviso que la integración Tauri original.
 */
export async function printReceiptIfTauri(
  payload: OperationPayload,
  documentType: PrintDocumentType
): Promise<string | null> {
  const r = await printThermalReceipt(payload, documentType);
  return r.warning;
}
