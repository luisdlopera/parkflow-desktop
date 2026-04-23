"use client";

import { previewLinesFromTicketDocument } from "@parkflow/print-core";
import type { PrintDocumentType, TicketDocument } from "@parkflow/types";
import {
  createDefaultPrintContext,
  createPrintContextWithUser,
  getLocalAgentClient,
  getTauriClient,
  type PrintPathOutcome
} from "./print-clients";
import {
  buildPrintQueueIdempotencyKey,
  enqueueLocalPrint,
  markJobDone,
  markJobRetryOrDead,
  pickNextJob
} from "./print-queue-idb";
import { buildTicketDocument, type OperationPayload } from "./ticket-build";
import { syncCreatePrintJobAfterPhysicalPrint } from "./print-sync";

function outcomeWarning(out: PrintPathOutcome): string | null {
  if (out.channel === "tauri") {
    return out.warning;
  }
  if (out.channel === "local_agent") {
    if (out.result.status === "failed") {
      return out.result.message;
    }
    if (!out.result.hardwareConfirmed) {
      return out.result.message;
    }
  }
  return null;
}

function runSync(
  payload: OperationPayload,
  documentType: PrintDocumentType,
  ticket: TicketDocument,
  idempotencyKey: string,
  ctx: { terminalId: string | null; operatorUserId: string | null }
): void {
  void syncCreatePrintJobAfterPhysicalPrint({
    sessionId: payload.sessionId,
    documentType,
    idempotencyKey,
    ticket,
    terminalId: ctx.terminalId,
    operatorUserId: ctx.operatorUserId
  });
}

/**
 * Misma `TicketDocument` -> preview (texto) y envío ESC/POS (Tauri o agente).
 */
export async function printThermalReceipt(
  payload: OperationPayload,
  documentType: PrintDocumentType
): Promise<{
  previewLines: string[];
  warning: string | null;
  channel: "local_agent" | "tauri" | "queued" | "unavailable";
}> {
  const ticket = buildTicketDocument(payload);
  const previewLines = previewLinesFromTicketDocument(documentType, ticket);
  const idempotencyKey = buildPrintQueueIdempotencyKey(ticket.ticketId, documentType);
  const base = createDefaultPrintContext(payload, { idempotencyKey, documentType, ticket });
  const ctx = await createPrintContextWithUser(base);
  const syncMeta = { sessionId: payload.sessionId ?? null, operatorUserId: ctx.operatorUserId };

  const agent = getLocalAgentClient();
  if (await agent.probe()) {
    try {
      const out = await agent.print(ctx);
      if (out.channel === "local_agent") {
        if (out.result.status !== "failed") {
          runSync(payload, documentType, ticket, idempotencyKey, ctx);
        }
        return {
          previewLines,
          warning: outcomeWarning(out),
          channel: "local_agent"
        };
      }
    } catch (e) {
      await enqueueLocalPrint(idempotencyKey, documentType, ticket, syncMeta);
      return {
        previewLines,
        warning:
          e instanceof Error
            ? `Agente de impresion: ${e.message}. Queda en cola local.`
            : "Error en agente. Queda en cola local.",
        channel: "queued"
      };
    }
  }

  const tauri = getTauriClient();
  if (await tauri.probe()) {
    const out = await tauri.print(ctx);
    if (out.channel === "tauri") {
      if (!out.result.error) {
        runSync(payload, documentType, ticket, idempotencyKey, ctx);
      }
      return { previewLines, warning: outcomeWarning(out), channel: "tauri" };
    }
  }

  await enqueueLocalPrint(idempotencyKey, documentType, ticket, syncMeta);
  return {
    previewLines,
    warning:
      "Sin agente local ni Tauri: el tiquete quedo en cola offline. Instala o inicia el Print Agent o abre la app de escritorio.",
    channel: "queued"
  };
}

let workerStarted = false;

export function startLocalPrintQueueWorker(): void {
  if (typeof window === "undefined" || workerStarted) {
    return;
  }
  workerStarted = true;

  const run = async () => {
    const job = await pickNextJob();
    if (!job) {
      return;
    }
    const idempotencyKey = buildPrintQueueIdempotencyKey(job.ticket.ticketId, job.documentType);
    const base = createDefaultPrintContext(
      {
        sessionId: job.sessionId ?? undefined,
        receipt: {
          ticketNumber: job.ticket.ticketNumber,
          plate: job.ticket.plate,
          vehicleType: job.ticket.vehicleType,
          site: job.ticket.site,
          lane: job.ticket.lane,
          booth: job.ticket.booth,
          terminal: job.ticket.terminal,
          entryAt: job.ticket.issuedAtIso
        }
      },
      { idempotencyKey, documentType: job.documentType, ticket: job.ticket }
    );
    const ctx = await createPrintContextWithUser(base);
    const agent = getLocalAgentClient();
    const tauri = getTauriClient();
    const sessionId = job.sessionId ?? undefined;

    try {
      if (await agent.probe()) {
        const out = await agent.print(ctx);
        if (out.channel === "local_agent") {
          if (out.result.status === "failed") {
            await markJobRetryOrDead(job, out.result.message);
            return;
          }
          await markJobDone(job.id);
          void syncCreatePrintJobAfterPhysicalPrint({
            sessionId,
            documentType: job.documentType,
            idempotencyKey: job.idempotencyKey,
            ticket: job.ticket,
            terminalId: ctx.terminalId,
            operatorUserId: job.operatorUserId ?? ctx.operatorUserId
          });
          return;
        }
      }
      if (await tauri.probe()) {
        const out = await tauri.print(ctx);
        if (out.channel === "tauri") {
          if (out.result.error) {
            await markJobRetryOrDead(job, out.result.error);
            return;
          }
          await markJobDone(job.id);
          void syncCreatePrintJobAfterPhysicalPrint({
            sessionId,
            documentType: job.documentType,
            idempotencyKey: job.idempotencyKey,
            ticket: job.ticket,
            terminalId: ctx.terminalId,
            operatorUserId: job.operatorUserId ?? ctx.operatorUserId
          });
          return;
        }
      }
      await markJobRetryOrDead(job, "sin agente de impresion disponible aun");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await markJobRetryOrDead(job, msg);
    }
  };

  setInterval(() => {
    void run();
  }, 5_000);
  void run();
}
