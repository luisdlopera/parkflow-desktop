import type { PrintDocumentType, PrintJobStatus, PrintResult, TicketDocument } from "./contracts";

/** Cuerpo POST /print hacia el Print Agent local. */
export interface LocalAgentPrintBody {
  idempotencyKey: string;
  documentType: PrintDocumentType;
  ticket: TicketDocument;
  /** Impresora configurada en el agente (default = default). */
  printerId?: string | null;
  terminalId?: string | null;
  operatorUserId?: string | null;
  clientOrigin?: string | null;
}

export interface LocalAgentPrintEnvelope {
  jobId: string;
  result: PrintResult;
}

export interface LocalAgentJobView {
  id: string;
  idempotencyKey: string;
  status: PrintJobStatus;
  createdAtIso: string;
  updatedAtIso: string;
  lastError: string | null;
  ticketId: string;
  documentType: PrintDocumentType;
  attemptCount: number;
}
