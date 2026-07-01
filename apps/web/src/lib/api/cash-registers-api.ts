import { apiFetch, cfgBase, buildApiHeaders, hdr } from "./_shared";
import type { PaginatedResponse } from "@/lib/types/api.types";
import { cashRegisterSchema } from "@/lib/schemas/config.schemas";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";
import type { CashRegisterRow } from "@/lib/types/settings.types";

export type { CashRegisterRow };

export async function fetchConfigurationCashRegisters(params: {
  siteId?: string;
  q?: string;
  active?: boolean | null;
  page?: number;
  size?: number;
}): Promise<PaginatedResponse<CashRegisterRow>> {
  const u = new URL(`${cfgBase()}/cash-registers`);
  if (params.siteId) u.searchParams.set("siteId", params.siteId);
  if (params.q) u.searchParams.set("q", params.q);
  if (params.active !== undefined && params.active !== null)
    u.searchParams.set("active", String(params.active));
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<PaginatedResponse<CashRegisterRow>>(u.toString(), {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}

export async function createConfigurationCashRegister(
  payload: Record<string, unknown>,
  auditReason?: string,
): Promise<CashRegisterRow> {
  const validatedBody = validatePayloadOrThrow(cashRegisterSchema, payload);
  return apiFetch<CashRegisterRow>(`${cfgBase()}/cash-registers`, {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}

export async function updateConfigurationCashRegister(
  id: string,
  payload: Record<string, unknown>,
  auditReason?: string,
): Promise<CashRegisterRow> {
  const validatedBody = validatePayloadOrThrow(cashRegisterSchema.partial(), payload);
  return apiFetch<CashRegisterRow>(`${cfgBase()}/cash-registers/${id}`, {
    method: "PUT",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}

export async function patchConfigurationCashRegisterStatus(
  id: string,
  active: boolean,
  auditReason?: string,
): Promise<CashRegisterRow> {
  return apiFetch<CashRegisterRow>(
    `${cfgBase()}/cash-registers/${id}/status?active=${active}`,
    {
      method: "PATCH",
      headers: await buildApiHeaders(hdr(auditReason)),
    },
  );
}
