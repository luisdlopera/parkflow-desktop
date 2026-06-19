import { apiFetch, cfgBase, buildApiHeaders, hdr, type SettingsPage } from "./_shared";
import { printerSchema } from "@/modules/settings/schemas";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";
import type { PrinterRow } from "@/modules/settings/types";

export type { PrinterRow };

export async function fetchConfigurationPrinters(params: {
  siteId?: string;
  q?: string;
  active?: boolean | null;
  page?: number;
  size?: number;
}): Promise<SettingsPage<PrinterRow>> {
  const u = new URL(`${cfgBase()}/printers`);
  if (params.siteId) u.searchParams.set("siteId", params.siteId);
  if (params.q) u.searchParams.set("q", params.q);
  if (params.active !== undefined && params.active !== null)
    u.searchParams.set("active", String(params.active));
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<SettingsPage<PrinterRow>>(u.toString(), {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}

export async function createConfigurationPrinter(
  payload: Record<string, unknown>,
  siteId: string,
  auditReason?: string,
): Promise<PrinterRow> {
  const validatedBody = validatePayloadOrThrow(printerSchema, payload);
  const u = new URL(`${cfgBase()}/printers`);
  u.searchParams.set("siteId", siteId);
  return apiFetch<PrinterRow>(u.toString(), {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}

export async function updateConfigurationPrinter(
  id: string,
  payload: Record<string, unknown>,
  auditReason?: string,
): Promise<PrinterRow> {
  const validatedBody = validatePayloadOrThrow(printerSchema.partial(), payload);
  return apiFetch<PrinterRow>(`${cfgBase()}/printers/${id}`, {
    method: "PUT",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}

export async function patchConfigurationPrinterStatus(
  id: string,
  active: boolean,
  auditReason?: string,
): Promise<PrinterRow> {
  return apiFetch<PrinterRow>(`${cfgBase()}/printers/${id}/status?active=${active}`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason)),
  });
}
