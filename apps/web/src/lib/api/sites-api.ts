import { apiFetch, cfgBase, buildApiHeaders, hdr, type SettingsPage } from "./_shared";
import { parkingSiteSchema } from "@/modules/settings/schemas";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";
import type { ParkingSiteRow } from "@/modules/settings/types";

export type { ParkingSiteRow };

export async function fetchConfigurationSites(params: {
  companyId?: string;
  q?: string;
  active?: boolean | null;
  page?: number;
  size?: number;
}): Promise<SettingsPage<ParkingSiteRow>> {
  const u = new URL(`${cfgBase()}/parking-sites`);
  if (params.companyId) u.searchParams.set("companyId", params.companyId);
  if (params.q) u.searchParams.set("q", params.q);
  if (params.active !== undefined && params.active !== null)
    u.searchParams.set("active", String(params.active));
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<SettingsPage<ParkingSiteRow>>(u.toString(), {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}

export async function createConfigurationSite(
  payload: Record<string, unknown>,
  companyId: string,
  auditReason?: string,
): Promise<ParkingSiteRow> {
  const validatedBody = validatePayloadOrThrow(parkingSiteSchema, payload);
  const u = new URL(`${cfgBase()}/parking-sites`);
  u.searchParams.set("companyId", companyId);
  return apiFetch<ParkingSiteRow>(u.toString(), {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}

export async function updateConfigurationSite(
  id: string,
  payload: Record<string, unknown>,
  auditReason?: string,
): Promise<ParkingSiteRow> {
  const validatedBody = validatePayloadOrThrow(parkingSiteSchema.partial(), payload);
  return apiFetch<ParkingSiteRow>(`${cfgBase()}/parking-sites/${id}`, {
    method: "PUT",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}

export async function patchConfigurationSiteStatus(
  id: string,
  active: boolean,
  auditReason?: string,
): Promise<ParkingSiteRow> {
  return apiFetch<ParkingSiteRow>(
    `${cfgBase()}/parking-sites/${id}/status?active=${active}`,
    {
      method: "PATCH",
      headers: await buildApiHeaders(hdr(auditReason)),
    },
  );
}
