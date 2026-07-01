import { apiFetch, cfgBase, buildApiHeaders, hdr } from "./_shared";
import type { PaginatedResponse } from "@/lib/types/api.types";
import { paymentMethodSchema } from "@/lib/schemas/config.schemas";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";
import type { PaymentMethodRow } from "@/lib/types/settings.types";

export type { PaymentMethodRow };

export async function fetchConfigurationPaymentMethods(params: {
  q?: string;
  active?: boolean | null;
  page?: number;
  size?: number;
}): Promise<PaginatedResponse<PaymentMethodRow>> {
  const u = new URL(`${cfgBase()}/payment-methods`);
  if (params.q) u.searchParams.set("q", params.q);
  if (params.active !== undefined && params.active !== null)
    u.searchParams.set("active", String(params.active));
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<PaginatedResponse<PaymentMethodRow>>(u.toString(), {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}

export async function createConfigurationPaymentMethod(
  payload: Record<string, unknown>,
  auditReason?: string,
): Promise<PaymentMethodRow> {
  const validatedBody = validatePayloadOrThrow(paymentMethodSchema, payload);
  return apiFetch<PaymentMethodRow>(`${cfgBase()}/payment-methods`, {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}

export async function updateConfigurationPaymentMethod(
  id: string,
  payload: Record<string, unknown>,
  auditReason?: string,
): Promise<PaymentMethodRow> {
  const validatedBody = validatePayloadOrThrow(paymentMethodSchema.partial(), payload);
  return apiFetch<PaymentMethodRow>(`${cfgBase()}/payment-methods/${id}`, {
    method: "PUT",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}

export async function patchConfigurationPaymentMethodStatus(
  id: string,
  active: boolean,
  auditReason?: string,
): Promise<PaymentMethodRow> {
  return apiFetch<PaymentMethodRow>(
    `${cfgBase()}/payment-methods/${id}/status?active=${active}`,
    {
      method: "PATCH",
      headers: await buildApiHeaders(hdr(auditReason)),
    },
  );
}

export async function deleteConfigurationPaymentMethod(
  id: string,
  auditReason?: string,
): Promise<void> {
  return apiFetch<void>(`${cfgBase()}/payment-methods/${id}`, {
    method: "DELETE",
    headers: await buildApiHeaders(hdr(auditReason)),
  });
}
