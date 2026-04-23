"use client";

import { buildApiHeaders } from "@/lib/api";
import type { CreatePrintJobRequest, PrintDocumentType, TicketDocument } from "@parkflow/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parkflowApiV1Root(): string {
  const operations =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "http://localhost:8080/api/v1/operations";
  if (operations.includes("/operations")) {
    return operations.replace(/\/operations\/?$/, "");
  }
  return operations.replace(/\/$/, "");
}

async function sha256Hex(plain: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(plain));
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Crea un registro de PrintJob en el backend (auditoria) sin bloquear la operacion caja
 * ni revertir un ticket ya impreso. Idempotente por `idempotencyKey` en el servidor.
 */
export async function syncCreatePrintJobAfterPhysicalPrint(input: {
  sessionId: string | undefined;
  documentType: PrintDocumentType;
  idempotencyKey: string;
  ticket: TicketDocument;
  terminalId: string | null;
  operatorUserId: string | null;
}): Promise<void> {
  if ((process.env.NEXT_PUBLIC_PRINT_SERVER_SYNC ?? "true").trim() === "false") {
    return;
  }
  if (!input.sessionId?.trim() || !input.operatorUserId?.trim()) {
    return;
  }
  if (!UUID_RE.test(input.sessionId) || !UUID_RE.test(input.operatorUserId)) {
    return;
  }

  const body: CreatePrintJobRequest = {
    sessionId: input.sessionId,
    operatorUserId: input.operatorUserId,
    documentType: input.documentType,
    idempotencyKey: input.idempotencyKey,
    payloadHash: await sha256Hex(JSON.stringify(input.ticket)),
    ticketSnapshotJson: JSON.stringify(input.ticket),
    terminalId: input.terminalId ?? undefined
  };

  try {
    const url = `${parkflowApiV1Root()}/print-jobs`;
    const r = await fetch(url, {
      method: "POST",
      headers: await buildApiHeaders(),
      body: JSON.stringify(body)
    });
    if (r.ok || r.status === 409) {
      return;
    }
  } catch {
    /* cola: no bloquea caja; el sync se puede reintentar desde otras vias */
  }
}
