import { apiFetch, cfgBase, buildApiHeaders, hdr } from "./_shared";
import type { PaginatedResponse } from "@/lib/types/api.types";

export type AgreementRow = {
  id: string;
  code: string;
  companyName: string;
  discountPercent: number;
  maxHoursPerDay: number;
  flatAmount: number | null;
  rateId: string | null;
  rateName: string | null;
  site: string | null;
  siteId: string | null;
  validFrom: string | null;
  validTo: string | null;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchAgreements(params: {
  site?: string;
  q?: string;
  active?: boolean | null;
  page?: number;
  size?: number;
}): Promise<PaginatedResponse<AgreementRow>> {
  const u = new URL(`${cfgBase()}/agreements`);
  if (params.site) u.searchParams.set("site", params.site);
  if (params.q) u.searchParams.set("q", params.q);
  if (params.active !== undefined && params.active !== null)
    u.searchParams.set("active", String(params.active));
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<PaginatedResponse<AgreementRow>>(u.toString(), {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}

export async function resolveAgreementByCode(code: string): Promise<AgreementRow> {
  return apiFetch<AgreementRow>(
    `${cfgBase()}/agreements/resolve?code=${encodeURIComponent(code)}`,
    {
      cache: "no-store",
      headers: await buildApiHeaders(),
    },
  );
}

export async function saveAgreement(
  payload: Record<string, unknown>,
  id?: string,
  auditReason?: string,
): Promise<AgreementRow> {
  const url = id ? `${cfgBase()}/agreements/${id}` : `${cfgBase()}/agreements`;
  return apiFetch<AgreementRow>(url, {
    method: id ? "PUT" : "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(payload),
  });
}

export async function patchAgreementStatus(
  id: string,
  active: boolean,
  auditReason?: string,
): Promise<AgreementRow> {
  return apiFetch<AgreementRow>(`${cfgBase()}/agreements/${id}/status?active=${active}`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason)),
  });
}
