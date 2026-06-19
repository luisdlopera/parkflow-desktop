import { buildApiHeaders } from "@/lib/api";
import { operationEntryRequestSchema, operationReprintRequestSchema } from "@/lib/validation/contracts";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";

import { opsBase } from "@/lib/api/config";
const apiBase = () => opsBase();

export type EntryRequestBody = Record<string, unknown>;

export async function createParkingEntry(body: EntryRequestBody): Promise<Response> {
  const validated = validatePayloadOrThrow(
    operationEntryRequestSchema,
    body,
    "Corrige los campos del ingreso antes de enviar",
  );
  return fetch(`${apiBase()}/entries`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(validated),
  });
}

export async function reprintEntryTicket(
  ticketNumber: string,
  operatorUserId: string,
  idempotencyKey: string,
): Promise<Response> {
  const body = validatePayloadOrThrow(
    operationReprintRequestSchema,
    {
      idempotencyKey,
      ticketNumber,
      operatorUserId,
      reason: "Reimpresion por fallo de impresora en ingreso",
    },
    "Datos de reimpresion invalidos",
  );
  return fetch(`${apiBase()}/tickets/reprint`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(body),
  });
}
