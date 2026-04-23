import type { LocalAgentPrintBody, PrintDocumentType, PrintResult, TicketDocument } from "@parkflow/types";
import { ticketDocumentToJson } from "./ticket-build";
import type { OperationPayload } from "./ticket-build";
import { directPrintAgentApiKey, printAgentPath } from "./print-agent-proxy-config";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export type PrintClientKind = "local_agent" | "tauri" | "none";

export type PrintPathOutcome =
  | { channel: "local_agent"; result: PrintResult; jobId: string }
  | { channel: "tauri"; result: TauriPrintOutcome; warning: string | null }
  | { channel: "none" };

type TauriPrintOutcome = {
  hardware_confirmed: boolean;
  status_byte?: number | null;
  status_hint?: string | null;
  error?: string | null;
};

export interface PrintContext {
  idempotencyKey: string;
  documentType: PrintDocumentType;
  ticket: TicketDocument;
  clientOrigin: string;
  operatorUserId: string | null;
  terminalId: string | null;
}

type PrinterConnection =
  | { type: "tcp"; host: string; port: number }
  | { type: "serial"; path: string; baud_rate: number };

function getPrinterConnection(): PrinterConnection {
  const type = (process.env.NEXT_PUBLIC_PRINTER_CONNECTION_TYPE ?? "tcp").toLowerCase();
  if (type === "serial") {
    return {
      type: "serial",
      path: process.env.NEXT_PUBLIC_PRINTER_SERIAL_PATH ?? "COM3",
      baud_rate: Number(process.env.NEXT_PUBLIC_PRINTER_BAUD_RATE ?? 9600)
    };
  }
  return {
    type: "tcp",
    host: process.env.NEXT_PUBLIC_PRINTER_TCP_HOST ?? "127.0.0.1",
    port: Number(process.env.NEXT_PUBLIC_PRINTER_TCP_PORT ?? 9100)
  };
}

function tauriWarningFrom(result: TauriPrintOutcome): string | null {
  if (!result.hardware_confirmed) {
    if (result.status_hint === "paper_end_detected") {
      return "Impresora sin papel o sensor en fin de papel; no se confirma impresion.";
    }
    if (result.status_byte == null) {
      return "Ticket enviado, pero la impresora no respondio al estado (no se confirma hardware).";
    }
    return "La impresora respondio pero no paso verificacion de listo (revisar papel/cubierta).";
  }
  return null;
}

export interface PrintClient {
  readonly kind: PrintClientKind;
  probe(): Promise<boolean>;
  print(ctx: PrintContext): Promise<PrintPathOutcome>;
}

export class LocalAgentPrintClient implements PrintClient {
  kind = "local_agent" as const;

  async probe(): Promise<boolean> {
    if (typeof window === "undefined") {
      return false;
    }
    const path = printAgentPath("/health");
    if (!path) {
      return false;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1_200);
    try {
      const headers: HeadersInit = { Accept: "application/json" };
      const k = directPrintAgentApiKey();
      if (k) {
        headers["X-API-Key"] = k;
      }
      const res = await fetch(path, { method: "GET", signal: ctrl.signal, headers, cache: "no-store" });
      clearTimeout(t);
      if (!res.ok) {
        return false;
      }
      const j = (await res.json()) as { ok?: boolean };
      return j?.ok === true;
    } catch {
      return false;
    } finally {
      clearTimeout(t);
    }
  }

  async print(ctx: PrintContext): Promise<PrintPathOutcome> {
    const path = printAgentPath("/print");
    if (!path) {
      return { channel: "none" };
    }
    const body: LocalAgentPrintBody = {
      idempotencyKey: ctx.idempotencyKey,
      documentType: ctx.documentType,
      ticket: ctx.ticket,
      terminalId: ctx.terminalId,
      operatorUserId: ctx.operatorUserId,
      clientOrigin: ctx.clientOrigin
    };
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json"
    };
    const k = directPrintAgentApiKey();
    if (k) {
      headers["X-API-Key"] = k;
    }
    const res = await fetch(path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store"
    });
    const j = (await res.json()) as { jobId?: string; result?: PrintResult; error?: string; duplicate?: boolean };
    if (!res.ok) {
      throw new Error(
        (j && "error" in j && (j as { error?: string }).error) || `print agent: HTTP ${res.status}`
      );
    }
    if (!j.result || !j.jobId) {
      throw new Error(
        (j && "error" in j && (j as { error?: string }).error) || "print agent: bad response"
      );
    }
    return { channel: "local_agent", result: j.result, jobId: j.jobId };
  }
}

export class TauriPrintClient implements PrintClient {
  kind = "tauri" as const;

  async probe(): Promise<boolean> {
    return isTauriRuntime();
  }

  async print(ctx: PrintContext): Promise<PrintPathOutcome> {
    if (typeof window === "undefined" || !isTauriRuntime()) {
      return { channel: "none" };
    }
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<TauriPrintOutcome>("print_escpos_ticket", {
      connection: getPrinterConnection(),
      documentType: ctx.documentType,
      ticketJson: ticketDocumentToJson(ctx.ticket)
    });
    if (result.error) {
      throw new Error(result.error);
    }
    return { channel: "tauri", result, warning: tauriWarningFrom(result) };
  }
}

export class NullPrintClient implements PrintClient {
  kind = "none" as const;

  async probe(): Promise<boolean> {
    return true;
  }

  async print(_ctx: PrintContext): Promise<PrintPathOutcome> {
    return { channel: "none" };
  }
}

export function createDefaultPrintContext(
  _payload: OperationPayload,
  ctx: {
    idempotencyKey: string;
    documentType: PrintDocumentType;
    ticket: TicketDocument;
  }
): PrintContext {
  if (typeof window === "undefined") {
    return {
      idempotencyKey: ctx.idempotencyKey,
      documentType: ctx.documentType,
      ticket: ctx.ticket,
      clientOrigin: "ssr",
      operatorUserId: null,
      terminalId: (process.env.NEXT_PUBLIC_TERMINAL_ID ?? "").trim() || null
    };
  }
  return {
    idempotencyKey: ctx.idempotencyKey,
    documentType: ctx.documentType,
    ticket: ctx.ticket,
    clientOrigin: window.location?.origin ?? "unknown",
    operatorUserId: null,
    terminalId: (process.env.NEXT_PUBLIC_TERMINAL_ID ?? "").trim() || null
  };
}

export async function createPrintContextWithUser(
  base: ReturnType<typeof createDefaultPrintContext>
): Promise<PrintContext> {
  try {
    const { loadSession } = await import("@/lib/auth");
    const s = await loadSession();
    const id = s?.user?.id != null ? String(s.user.id) : null;
    return { ...base, operatorUserId: id };
  } catch {
    return base;
  }
}

let cachedAgent: LocalAgentPrintClient | null = null;
let cachedTauri: TauriPrintClient | null = null;

export function getLocalAgentClient(): LocalAgentPrintClient {
  cachedAgent ??= new LocalAgentPrintClient();
  return cachedAgent;
}

export function getTauriClient(): TauriPrintClient {
  cachedTauri ??= new TauriPrintClient();
  return cachedTauri;
}
