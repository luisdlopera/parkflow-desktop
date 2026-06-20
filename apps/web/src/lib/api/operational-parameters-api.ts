import { apiFetch, cfgBase, buildApiHeaders, hdr } from "./_shared";
import { operationalParameterSchema } from "@/lib/schemas/config.schemas";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";
import type { OperationalParameterRow } from "@/lib/types/settings.types";

export type { OperationalParameterRow };

export async function fetchConfigurationOperationalParameters(
  siteId: string,
): Promise<OperationalParameterRow> {
  const u = new URL(`${cfgBase()}/operational-parameters`);
  u.searchParams.set("siteId", siteId);
  return apiFetch<OperationalParameterRow>(u.toString(), {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}

export async function putConfigurationOperationalParameters(
  siteId: string,
  payload: Record<string, unknown>,
  auditReason?: string,
): Promise<OperationalParameterRow> {
  const validatedBody = validatePayloadOrThrow(operationalParameterSchema, payload);
  const u = new URL(`${cfgBase()}/operational-parameters`);
  u.searchParams.set("siteId", siteId);
  return apiFetch<OperationalParameterRow>(u.toString(), {
    method: "PUT",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}
