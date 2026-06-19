import { buildApiHeaders } from "@/lib/api";
import {
  operationExitRequestSchema,
  operationLostTicketRequestSchema,
  operationReprintRequestSchema,
} from "@/lib/validation/contracts";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";
import type { PaymentMethodCode } from "@/lib/payment-method-catalog";
import type { SplitPaymentRow } from "../hooks/useSplitPayment";

import { opsBase } from "@/lib/api/config";
const apiBase = () => opsBase();

export async function lookupActiveSession(
  ticketNumber: string,
  plate: string,
  agreementCode?: string,
): Promise<Response> {
  const params = new URLSearchParams();
  if (ticketNumber) params.set("ticketNumber", ticketNumber);
  if (plate) params.set("plate", plate);
  if (agreementCode) params.set("agreementCode", agreementCode);
  return fetch(`${apiBase()}/sessions/active?${params.toString()}`, {
    headers: await buildApiHeaders(),
    cache: "no-store",
  });
}

export async function processExit(body: Record<string, unknown>): Promise<Response> {
  const validated = validatePayloadOrThrow(operationExitRequestSchema, body);
  return fetch(`${apiBase()}/exits`, {
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
): Promise<Response> {
  const body = validatePayloadOrThrow(operationReprintRequestSchema, {
    idempotencyKey,
    ticketNumber,
    operatorUserId,
    reason,
  });
  return fetch(`${apiBase()}/tickets/reprint`, {
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
): Promise<Response> {
  const body = validatePayloadOrThrow(operationLostTicketRequestSchema, {
    idempotencyKey,
    ticketNumber,
    plate,
    operatorUserId,
    reason,
  });
  return fetch(`${apiBase()}/tickets/lost`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(body),
  });
}

export function buildExitBody(params: {
  userId: string;
  ticketNumber: string;
  paymentMethod: PaymentMethodCode;
  cashSessionId: string | null;
  observations: string | null;
  vehicleCondition: string;
  conditionChecklist: string;
  conditionPhotoUrls: string;
  agreementCode: string;
  pendingCustodiedItems: unknown[];
  returnConfirmedIds: string[];
  idempotencyKey: string;
  splitPayments?: SplitPaymentRow[];
}): Record<string, unknown> {
  return {
    idempotencyKey: params.idempotencyKey,
    ticketNumber: params.ticketNumber,
    operatorUserId: params.userId,
    paymentMethod: params.paymentMethod,
    cashSessionId: params.cashSessionId,
    observations: params.observations,
    vehicleCondition: params.vehicleCondition,
    conditionChecklist: params.conditionChecklist
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean),
    conditionPhotoUrls: params.conditionPhotoUrls
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean),
    agreementCode: params.agreementCode.trim() || null,
    returnedItemIds:
      params.pendingCustodiedItems.length > 0 ? params.returnConfirmedIds : undefined,
    custodiedItemObservations:
      params.pendingCustodiedItems.length > 0 ? "Devuelto en salida" : null,
    paymentBreakdown:
      params.paymentMethod === "MIXED"
        ? params.splitPayments
            ?.filter((r) => Number(r.amount) > 0)
            .map((r) => ({ method: r.method, amount: Number(r.amount) }))
        : undefined,
  };
}
