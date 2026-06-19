"use client";

import { buildApiHeaders } from "@/lib/api";
import { apiV1Base } from "@/lib/settings-api";
import {
  cashCloseRequestSchema,
  cashCountRequestSchema,
  cashMovementRequestSchema,
  cashOpenRequestSchema,
  cashVoidMovementRequestSchema
} from "@/lib/validation/contracts";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export type CashSessionDto = {
  id: string;
  register: { id: string; site: string; terminal: string; label: string | null };
  operatorId: string;
  operatorName?: string | null;
  status: string;
  openingAmount: number;
  openedAt: string;
  closedAt: string | null;
  closedById: string | null;
  closedByName?: string | null;
  expectedAmount: number | null;
  countedAmount: number | null;
  differenceAmount: number | null;
  countCash: number | null;
  countCard: number | null;
  countTransfer: number | null;
  countOther: number | null;
  notes: string | null;
  closingNotes: string | null;
  closingWitnessName?: string | null;
  supportDocumentNumber?: string | null;
  countedAt: string | null;
  countOperatorId: string | null;
  countOperatorName?: string | null;
};

export type CashMovementDto = {
  id: string;
  cashSessionId: string;
  movementType: string;
  paymentMethod: string;
  amount: number;
  parkingSessionId: string | null;
  reason: string | null;
  metadata: string | null;
  status: string;
  voidedAt: string | null;
  voidReason: string | null;
  voidedById: string | null;
  externalReference: string | null;
  createdById: string;
  createdByName?: string | null;
  createdAt: string;
  terminal: string | null;
  idempotencyKey: string | null;
};

export type CashSummaryDto = {
  openingAmount: number;
  expectedLedgerTotal: number;
  countedTotal: number | null;
  difference: number | null;
  totalsByPaymentMethod: Record<string, number>;
  totalsByMovementType: Record<string, number>;
  movementCount: number;
};

export type CashClosingPrintDto = {
  documentType: string;
  ticketDocument: Record<string, unknown>;
  previewLines: string[];
};

export type CashPolicyDto = {
  requireOpenForPayment: boolean;
  offlineCloseAllowed: boolean;
  offlineMaxManualMovement: number;
  operationsHint: string;
  resolvedForSite: string;
};

export type CashRegisterRow = { id: string; site: string; terminal: string; label: string | null };

export async function cashPolicy(site?: string | null): Promise<CashPolicyDto> {
  const u = new URL(`${apiV1Base()}/cash/policy`);
  if (site) {
    u.searchParams.set("site", site);
  }
  const res = await fetch(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as CashPolicyDto;
}

export async function cashRegisters(site?: string | null): Promise<CashRegisterRow[]> {
  const u = new URL(`${apiV1Base()}/cash/registers`);
  if (site) {
    u.searchParams.set("site", site);
  }
  const res = await fetch(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as CashRegisterRow[];
}

export async function cashOpen(body: {
  site: string;
  terminal: string;
  registerLabel?: string | null;
  openingAmount: number;
  operatorUserId: string;
  openIdempotencyKey?: string | null;
  notes?: string | null;
}): Promise<CashSessionDto> {
  const validatedBody = validatePayloadOrThrow(cashOpenRequestSchema, body);
  const res = await fetch(`${apiV1Base()}/cash/open`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(validatedBody)
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as CashSessionDto;
}

export async function cashCurrent(site?: string | null, terminal?: string | null): Promise<CashSessionDto> {
  const u = new URL(`${apiV1Base()}/cash/current`);
  if (site) {
    u.searchParams.set("site", site);
  }
  if (terminal) {
    u.searchParams.set("terminal", terminal);
  }
  const res = await fetch(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as CashSessionDto;
}

export async function cashMovements(sessionId: string): Promise<CashMovementDto[]> {
  const res = await fetch(`${apiV1Base()}/cash/sessions/${sessionId}/movements`, {
    cache: "no-store",
    headers: await buildApiHeaders()
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as CashMovementDto[];
}

export async function cashSummary(sessionId: string): Promise<CashSummaryDto> {
  const res = await fetch(`${apiV1Base()}/cash/sessions/${sessionId}/summary`, {
    cache: "no-store",
    headers: await buildApiHeaders()
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as CashSummaryDto;
}

export async function cashAddMovement(
  sessionId: string,
  body: {
    type: string;
    paymentMethod: string;
    amount: number;
    parkingSessionId?: string | null;
    reason?: string | null;
    metadataJson?: string | null;
    externalReference?: string | null;
    idempotencyKey?: string | null;
  },
  options?: { offline?: boolean }
): Promise<CashMovementDto> {
  const validatedBody = validatePayloadOrThrow(cashMovementRequestSchema, body);
  const res = await fetch(`${apiV1Base()}/cash/sessions/${sessionId}/movements`, {
    method: "POST",
    headers: await buildApiHeaders({
      offline: Boolean(options?.offline)
    }),
    body: JSON.stringify(validatedBody)
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as CashMovementDto;
}

export async function cashVoidMovement(
  sessionId: string,
  movementId: string,
  reason: string,
  idempotencyKey?: string | null
): Promise<CashMovementDto> {
  const validatedBody = validatePayloadOrThrow(cashVoidMovementRequestSchema, {
    reason,
    idempotencyKey: idempotencyKey ?? undefined
  });
  const res = await fetch(
    `${apiV1Base()}/cash/sessions/${sessionId}/movements/${movementId}/void`,
    {
      method: "POST",
      headers: await buildApiHeaders({ auditReason: reason }),
      body: JSON.stringify(validatedBody)
    }
  );
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as CashMovementDto;
}

export async function cashCount(
  sessionId: string,
  body: {
    countCash: number;
    countCard: number;
    countTransfer: number;
    countOther: number;
    observations?: string | null;
  }
): Promise<CashSessionDto> {
  const validatedBody = validatePayloadOrThrow(cashCountRequestSchema, body);
  const res = await fetch(`${apiV1Base()}/cash/sessions/${sessionId}/count`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(validatedBody)
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as CashSessionDto;
}

export type CashAuditEntryDto = {
  id: string;
  action: string;
  actorUserId: string | null;
  actorName: string | null;
  terminalId: string | null;
  clientIp: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  metadata: string | null;
  createdAt: string;
};

export async function cashAudit(sessionId: string): Promise<CashAuditEntryDto[]> {
  const res = await fetch(`${apiV1Base()}/cash/sessions/${sessionId}/audit`, {
    cache: "no-store",
    headers: await buildApiHeaders()
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as CashAuditEntryDto[];
}

export async function cashClose(
  sessionId: string,
  body: {
    closingNotes?: string | null;
    closingWitnessName?: string | null;
    closeIdempotencyKey?: string | null;
  }
): Promise<CashSessionDto> {
  const validatedBody = validatePayloadOrThrow(cashCloseRequestSchema, body);
  const res = await fetch(`${apiV1Base()}/cash/sessions/${sessionId}/close`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(validatedBody)
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as CashSessionDto;
}

export async function cashPrintClosing(sessionId: string): Promise<CashClosingPrintDto> {
  const res = await fetch(`${apiV1Base()}/cash/sessions/${sessionId}/print-closing`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify({})
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as CashClosingPrintDto;
}
