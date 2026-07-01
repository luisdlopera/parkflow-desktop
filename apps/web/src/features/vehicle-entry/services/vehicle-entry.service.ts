import { buildApiHeaders } from "@/lib/api";
import safeFetch from "@/lib/api/fetch";
import { operationEntryRequestSchema, operationReprintRequestSchema } from "@/lib/validation/contracts";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";

import { opsBase } from "@/lib/api/config";

const apiBase = () => opsBase();

export type EntryRequestBody = Record<string, unknown>;

export type ParkingEntryResponse = {
  sessionId: string;
  receipt: {
    ticketNumber: string;
    plate: string;
    vehicleType: string;
    site?: string | null;
    lane?: string | null;
    booth?: string | null;
    terminal?: string | null;
    parkingSpaceCode?: string | null;
    entryAt?: string | null;
  };
};

export async function createParkingEntry(body: EntryRequestBody): Promise<ParkingEntryResponse> {
  const validated = validatePayloadOrThrow(
    operationEntryRequestSchema,
    body,
    "Corrige los campos del ingreso antes de enviar",
  );
  return safeFetch<ParkingEntryResponse>(`${apiBase()}/entries`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(validated),
  });
}

export async function reprintEntryTicket(
  ticketNumber: string,
  operatorUserId: string,
  idempotencyKey: string,
): Promise<void> {
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
  await safeFetch<void>(`${apiBase()}/tickets/reprint`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(body),
  });
}
