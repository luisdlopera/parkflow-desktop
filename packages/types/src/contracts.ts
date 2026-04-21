/** Frozen API surface — see docs/architecture/offline-printing-v1.md */
export const PARKFLOW_API_V1 = "/api/v1" as const;

export type VehicleType = "CAR" | "MOTORCYCLE" | "VAN" | "TRUCK" | "OTHER";

export type PrintDocumentType = "ENTRY" | "EXIT" | "REPRINT" | "LOST_TICKET";

export type PrintJobStatus =
  | "created"
  | "queued"
  | "processing"
  | "sent"
  | "acked"
  | "failed"
  | "dead_letter";

export type SyncEventStatus = "pending" | "processing" | "synced" | "failed";

export type SyncEventType = "ENTRY_RECORDED" | "EXIT_RECORDED" | "TICKET_REPRINTED" | "LOST_TICKET";

/** Paper width for layout; templates must support both. */
export type TicketPaperWidthMm = 58 | 80;

/** Versioned ticket layout — bump when fields or alignment change. */
export type TicketTemplateVersion = "ticket-layout-v1";

/**
 * ESC/POS profile slug consumed by the desktop printer layer (`printer_profile::resolve_profile` in Rust).
 * Extend only with a certified hardware matrix entry.
 */
export type TicketPrinterProfile =
  | "epson_tm_t20iii"
  | "xprinter_80_generic_esc_pos"
  | "bixolon_srp330iii"
  | "bixolon_srp332ii"
  | "generic_58mm_esc_pos";

/**
 * Canonical ticket id for idempotency (equals ticketNumber when no external id exists).
 * Unique per parking operation (session / ticket issuance).
 */
export interface TicketDocument {
  ticketId: string;
  templateVersion: TicketTemplateVersion;
  paperWidthMm: TicketPaperWidthMm;
  ticketNumber: string;
  parkingName: string;
  plate: string;
  vehicleType: VehicleType;
  site: string | null;
  lane: string | null;
  booth: string | null;
  terminal: string | null;
  operatorName: string | null;
  issuedAtIso: string;
  legalMessage: string | null;
  qrPayload: string | null;
  barcodePayload: string | null;
  copyNumber: number;
  printerProfile?: TicketPrinterProfile | null;
}

export interface PrintJob {
  id: string;
  sessionId: string;
  documentType: PrintDocumentType;
  status: PrintJobStatus;
  /** Idempotency key for create — one logical print job per key. */
  idempotencyKey: string;
  payloadHash: string;
  attempts: number;
  createdAtIso: string;
  updatedAtIso: string;
  ticketNumber?: string;
  terminalId?: string | null;
}

export interface PrintResult {
  jobId: string;
  status: PrintJobStatus;
  message: string;
  printedAtIso: string | null;
  /** When false, status must not be treated as a confirmed physical print. */
  hardwareConfirmed: boolean;
}

export interface DeviceConfig {
  printerId: string;
  name: string;
  protocol: "ESC_POS" | "STAR_PRNT" | "BXL_POS" | "WINDOWS_DRIVER";
  connection: "USB" | "TCP" | "SERIAL";
  usbPath: string | null;
  tcpHost: string | null;
  tcpPort: number | null;
  serialPort: string | null;
  baudRate: number | null;
  enabled: boolean;
}

export interface PrinterHealth {
  printerId: string;
  online: boolean;
  hasPaper: boolean | null;
  lastSuccessAtIso: string | null;
  lastError: string | null;
}

export interface SyncEvent {
  id: string;
  type: SyncEventType;
  sessionId: string;
  status: SyncEventStatus;
  payload: unknown;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface PrintAttemptRecord {
  id: string;
  printJobId: string;
  attemptKey: string;
  status: PrintJobStatus;
  errorMessage: string | null;
  createdAtIso: string;
}

/** Server create body — aligns with Java CreatePrintJobRequest. */
export interface CreatePrintJobRequest {
  sessionId: string;
  operatorUserId: string;
  documentType: PrintDocumentType;
  idempotencyKey: string;
  payloadHash: string;
  /** Optional JSON snapshot of TicketDocument for ticket-centric audit. */
  ticketSnapshotJson?: string | null;
  terminalId?: string | null;
}

export interface UpdatePrintJobStatusRequest {
  idempotencyKey: string;
  status: PrintJobStatus;
  errorMessage?: string | null;
}

export interface RetryPrintJobRequest {
  idempotencyKey: string;
  reason?: string | null;
}

export interface SyncPushRequest {
  idempotencyKey: string;
  eventType: string;
  aggregateId: string;
  payloadJson: string;
}

export interface SyncEventResponse {
  id: string;
  idempotencyKey: string;
  eventType: string;
  aggregateId: string;
  payloadJson: string;
  direction: "PUSH" | "PULL";
  createdAtIso: string;
  syncedAtIso: string | null;
}

export interface SyncReconcileRequest {
  eventIds: string[];
}

/** Idempotency key conventions (client-generated, stable per operation). */
export function printJobIdempotencyKey(ticketId: string, documentType: PrintDocumentType, scope: string): string {
  return `pj:${ticketId}:${documentType}:${scope}`;
}

export function printAttemptIdempotencyKey(printJobId: string, transition: string, attemptSeq: number): string {
  return `pa:${printJobId}:${transition}:${attemptSeq}`;
}
