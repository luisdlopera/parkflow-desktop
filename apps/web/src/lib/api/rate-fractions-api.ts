import { apiFetch, cfgBase, buildApiHeaders, hdr } from "./_shared";
import { rateFractionSchema } from "@/modules/settings/schemas";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";
import type { RateFractionRow } from "@/modules/settings/types";

export type { RateFractionRow };

export async function fetchConfigurationRateFractions(
  rateId: string,
): Promise<RateFractionRow[]> {
  const u = new URL(`${cfgBase()}/rate-fractions`);
  u.searchParams.set("rateId", rateId);
  return apiFetch<RateFractionRow[]>(u.toString(), {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}

export async function createConfigurationRateFraction(
  rateId: string,
  payload: Record<string, unknown>,
  auditReason?: string,
): Promise<RateFractionRow> {
  const validatedBody = validatePayloadOrThrow(rateFractionSchema, payload);
  const u = new URL(`${cfgBase()}/rate-fractions`);
  u.searchParams.set("rateId", rateId);
  return apiFetch<RateFractionRow>(u.toString(), {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}

export async function updateConfigurationRateFraction(
  id: string,
  payload: Record<string, unknown>,
  auditReason?: string,
): Promise<RateFractionRow> {
  const validatedBody = validatePayloadOrThrow(rateFractionSchema, payload);
  return apiFetch<RateFractionRow>(`${cfgBase()}/rate-fractions/${id}`, {
    method: "PUT",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}

export async function deleteConfigurationRateFraction(
  id: string,
  auditReason?: string,
): Promise<void> {
  return apiFetch<void>(`${cfgBase()}/rate-fractions/${id}`, {
    method: "DELETE",
    headers: await buildApiHeaders(hdr(auditReason)),
  });
}
