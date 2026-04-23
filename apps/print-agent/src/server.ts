import Fastify, { type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import { randomUUID } from "node:crypto";
import * as path from "node:path";
import type { LocalAgentPrintBody, PrintJobStatus, PrintResult } from "@parkflow/types";
import { buildEscPosReceiptBytes, resolveEscPosProfile } from "@parkflow/print-core";
import { agentApiKey, agentPort, allowedOrigins, auditPath, dataDir, loadPrintersFromEnv } from "./config.js";
import { dispatchEscPosJob, printerQuickHealth } from "./dispatch.js";
import { PrintAgentState } from "./state-store.js";
import { appendAudit, type AuditEntry } from "./audit.js";

const printers = loadPrintersFromEnv(process.cwd());
const state = new PrintAgentState(dataDir);
state.load();

const printInFlight = new Map<string, Promise<Record<string, unknown>>>();

function findPrinter(id: string | null | undefined) {
  if (!id || id === "default") {
    return printers[0]!;
  }
  return printers.find((p) => p.id === id) ?? null;
}

function requireApiKey(request: FastifyRequest): void {
  if (!agentApiKey) {
    return;
  }
  const h = request.headers.authorization;
  const x = request.headers["x-api-key"];
  const fromBearer =
    typeof h === "string" && h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : null;
  const fromHeader = typeof x === "string" ? x.trim() : null;
  const fromQuery =
    request.query && typeof request.query === "object" && "token" in request.query
      ? String((request.query as { token?: string }).token ?? "")
      : null;
  const token = fromBearer || fromHeader || fromQuery;
  if (token !== agentApiKey) {
    appendAudit(auditPath, {
      atIso: new Date().toISOString(),
      event: "auth_fail",
      jobId: "—",
      idempotencyKey: "—",
      ticketId: "—",
      documentType: "—",
      terminalId: null,
      operatorUserId: null,
      clientOrigin: String(request.headers.origin ?? ""),
      ok: false,
      message: "invalid api key"
    });
    const e = new Error("unauthorized");
    (e as { statusCode?: number }).statusCode = 401;
    throw e;
  }
}

function requireOrigin(request: FastifyRequest): void {
  const origin = request.headers.origin;
  if (!origin) {
    return;
  }
  if (!allowedOrigins.includes(origin)) {
    appendAudit(auditPath, {
      atIso: new Date().toISOString(),
      event: "origin_reject",
      jobId: "—",
      idempotencyKey: "—",
      ticketId: "—",
      documentType: "—",
      terminalId: null,
      operatorUserId: null,
      clientOrigin: String(origin),
      ok: false
    });
    const e = new Error("origin not allowed");
    (e as { statusCode?: number }).statusCode = 403;
    throw e;
  }
}

function toPrintResult(
  jobId: string,
  disp: { hardwareConfirmed: boolean; statusByte: number | null; statusHint: string | null }
): PrintResult {
  if (disp.statusHint === "paper_end_detected") {
    return {
      jobId,
      status: "failed",
      message: "Impresora sin papel o sensor en fin de papel.",
      printedAtIso: new Date().toISOString(),
      hardwareConfirmed: false
    };
  }
  if (!disp.hardwareConfirmed) {
    return {
      jobId,
      status: "sent",
      message:
        disp.statusByte == null
          ? "Bytes enviados; impresora no respondio al estado (no confirmacion de hardware)."
          : "Impresora respondio; verificacion de listo no superada (revisar papel/cubierta).",
      printedAtIso: new Date().toISOString(),
      hardwareConfirmed: false
    };
  }
  return {
    jobId,
    status: "acked",
    message: "Impreso y estado OK.",
    printedAtIso: new Date().toISOString(),
    hardwareConfirmed: true
  };
}

function toJobStatus(result: PrintResult): PrintJobStatus {
  if (result.status === "failed") {
    return "failed";
  }
  if (result.status === "acked") {
    return "acked";
  }
  return "sent";
}

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: (o, cb) => {
    if (!o) {
      cb(null, true);
      return;
    }
    cb(null, allowedOrigins.includes(o));
  }
});

app.addHook("onRequest", async (req) => {
  if (req.method === "OPTIONS") {
    return;
  }
  requireApiKey(req);
  requireOrigin(req);
});

app.get("/health", async () => ({
  ok: true,
  version: "0.1.0",
  printers: printers.length,
  hasApiKey: Boolean(agentApiKey)
}));

app.get("/printers", async () => ({
  items: printers.map((p) => ({
    id: p.id,
    name: p.name,
    modelProfile: p.modelProfile,
    connection: p.connection
  }))
}));

app.get("/jobs/:id", async (req) => {
  const { id } = req.params as { id: string };
  const row = state.getById(id);
  if (!row) {
    return { error: "not found" };
  }
  return { job: state.toView(row), result: row.result };
});

app.post("/print", async (req) => {
  const body = req.body as LocalAgentPrintBody;
  if (!body?.idempotencyKey?.trim() || !body.ticket || !body.documentType) {
    return { error: "idempotencyKey, ticket, documentType required" };
  }

  const prior = state.getByIdempotency(body.idempotencyKey);
  if (prior?.result) {
    return { jobId: prior.id, result: prior.result, duplicate: true as const };
  }

  let inFlight = printInFlight.get(body.idempotencyKey);
  if (!inFlight) {
    inFlight = runLocalPrintJob(req, body).finally(() => {
      printInFlight.delete(body.idempotencyKey);
    });
    printInFlight.set(body.idempotencyKey, inFlight);
  }
  return inFlight;
});

async function runLocalPrintJob(
  req: FastifyRequest,
  body: LocalAgentPrintBody
): Promise<Record<string, unknown>> {
  const prior = state.getByIdempotency(body.idempotencyKey);

  const device = findPrinter(body.printerId);
  if (!device) {
    return { error: "printer not found" };
  }

  const jobId = prior?.id ?? randomUUID();
  const now = new Date().toISOString();

  state.upsertJob(body.idempotencyKey, {
    id: jobId,
    idempotencyKey: body.idempotencyKey,
    ticketId: body.ticket.ticketId,
    documentType: body.documentType,
    status: "processing",
    createdAtIso: prior?.createdAtIso ?? now,
    updatedAtIso: now,
    lastError: null,
    attemptCount: (prior?.attemptCount ?? 0) + 1,
    result: null
  });

  try {
    const disp = await dispatchEscPosJob(device, body.documentType, body.ticket);
    const result = toPrintResult(jobId, disp);
    const js = toJobStatus(result);
    state.upsertJob(body.idempotencyKey, {
      id: jobId,
      idempotencyKey: body.idempotencyKey,
      ticketId: body.ticket.ticketId,
      documentType: body.documentType,
      status: js,
      createdAtIso: prior?.createdAtIso ?? now,
      updatedAtIso: new Date().toISOString(),
      lastError: result.status === "failed" ? result.message : null,
      attemptCount: prior ? prior.attemptCount + 1 : 1,
      result
    });
    const audit: AuditEntry = {
      atIso: new Date().toISOString(),
      event: "print",
      jobId,
      idempotencyKey: body.idempotencyKey,
      ticketId: body.ticket.ticketId,
      documentType: body.documentType,
      terminalId: body.terminalId ?? null,
      operatorUserId: body.operatorUserId ?? null,
      clientOrigin: body.clientOrigin ?? (req.headers.origin as string) ?? null,
      ok: result.status !== "failed",
      message: result.message
    };
    appendAudit(auditPath, audit);
    return { jobId, result, duplicate: false as const };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const result: PrintResult = {
      jobId,
      status: "failed",
      message,
      printedAtIso: new Date().toISOString(),
      hardwareConfirmed: false
    };
    state.upsertJob(body.idempotencyKey, {
      id: jobId,
      idempotencyKey: body.idempotencyKey,
      ticketId: body.ticket.ticketId,
      documentType: body.documentType,
      status: "failed",
      createdAtIso: prior?.createdAtIso ?? now,
      updatedAtIso: new Date().toISOString(),
      lastError: message,
      attemptCount: prior ? prior.attemptCount + 1 : 1,
      result
    });
    appendAudit(auditPath, {
      atIso: new Date().toISOString(),
      event: "print",
      jobId,
      idempotencyKey: body.idempotencyKey,
      ticketId: body.ticket.ticketId,
      documentType: body.documentType,
      terminalId: body.terminalId ?? null,
      operatorUserId: body.operatorUserId ?? null,
      clientOrigin: body.clientOrigin ?? (req.headers.origin as string) ?? null,
      ok: false,
      message
    });
    return { jobId, result, duplicate: false as const };
  }
}

app.post("/test-print", async (req) => {
  const q = req.query as { printerId?: string };
  const device = findPrinter(q.printerId);
  if (!device) {
    return { error: "printer not found" };
  }
  const profile = resolveEscPosProfile(device.modelProfile);
  const testTicket = {
    ticketId: "test",
    templateVersion: "ticket-layout-v1" as const,
    paperWidthMm: 58 as const,
    ticketNumber: "TEST",
    parkingName: "Parkflow",
    plate: "TEST",
    vehicleType: "CAR" as const,
    site: null,
    lane: null,
    booth: null,
    terminal: null,
    operatorName: null,
    issuedAtIso: new Date().toISOString(),
    legalMessage: null,
    qrPayload: null,
    barcodePayload: null,
    copyNumber: 1,
    printerProfile: device.modelProfile
  };
  buildEscPosReceiptBytes("ENTRY", testTicket, profile);
  const disp = await dispatchEscPosJob(device, "ENTRY", testTicket);
  const jobId = randomUUID();
  const result = toPrintResult(jobId, disp);
  appendAudit(auditPath, {
    atIso: new Date().toISOString(),
    event: "test_print",
    jobId,
    idempotencyKey: "test",
    ticketId: "test",
    documentType: "ENTRY",
    terminalId: null,
    operatorUserId: null,
    clientOrigin: (req.headers.origin as string) ?? null,
    ok: true,
    message: "test_print"
  });
  return { jobId, result };
});

app.get("/printers/:id/health", async (req) => {
  const { id } = req.params as { id: string };
  const p = findPrinter(id);
  if (!p) {
    return { error: "not found" };
  }
  const h = await printerQuickHealth(p, p.modelProfile);
  return { printerId: p.id, ...h };
});

try {
  await app.listen({ port: agentPort, host: "127.0.0.1" });
  app.log.info(`Print agent http://127.0.0.1:${agentPort} dataDir=${path.resolve(dataDir)}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
