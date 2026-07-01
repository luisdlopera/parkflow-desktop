import { buildApiHeaders } from "@/lib/api";
import safeFetch from "@/lib/api/fetch";
import {
  operationExitRequestSchema,
  operationLostTicketRequestSchema,
  operationReprintRequestSchema,
} from "@/lib/validation/contracts";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";
import type { PaymentMethodCode } from "@/lib/payment-method-catalog";
import type { SplitPaymentRow } from "../hooks/useSplitPayment";

import { opsBase } from "@/lib/api/config";
import type { ActiveLookup } from "../types";

const apiBase = () => opsBase();

export async function lookupActiveSession(
  ticketNumber: string,
  plate: string,
  agreementCode?: string,
): Promise<ActiveLookup> {
  const params = new URLSearchParams();
  if (ticketNumber) params.set("ticketNumber", ticketNumber);
  if (plate) params.set("plate", plate);
  if (agreementCode) params.set("agreementCode", agreementCode);
  return safeFetch<ActiveLookup>(`${apiBase()}/sessions/active?${params.toString()}`, {
    headers: await buildApiHeaders(),
    cache: "no-store",
  });
}

export async function processExit(body: Record<string, unknown>): Promise<ActiveLookup> {
  const validated = validatePayloadOrThrow(operationExitRequestSchema, body);
  return safeFetch<ActiveLookup>(`${apiBase()}/exits`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(validated),
  });
}

export async function reprintExitTicket(
  ticketNumber: string,
  operatorUserId: string,
  idempotencyKey: string,
  reason: string,
): Promise<ActiveLookup> {
  const body = validatePayloadOrThrow(operationReprintRequestSchema, {
    idempotencyKey,
    ticketNumber,
    operatorUserId,
    reason,
  });
  return safeFetch<ActiveLookup>(`${apiBase()}/tickets/reprint`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(body),
  });
}

export async function reportLostTicket(
  ticketNumber: string,
  plate: string,
  operatorUserId: string,
  idempotencyKey: string,
  reason: string,
): Promise<ActiveLookup> {
  const body = validatePayloadOrThrow(operationLostTicketRequestSchema, {
    idempotencyKey,
    ticketNumber,
    plate,
    operatorUserId,
    reason,
  });
  return safeFetch<ActiveLookup>(`${apiBase()}/tickets/lost`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(body),
  });
}

