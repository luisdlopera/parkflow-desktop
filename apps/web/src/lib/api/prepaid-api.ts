import { apiFetch, cfgBase, buildApiHeaders, hdr } from "./_shared";
import type { PaginatedResponse } from "@/lib/types/api.types";

export type PrepaidPackageRow = {
  id: string;
  name: string;
  hoursIncluded: number;
  amount: number;
  vehicleType: string | null;
  site: string | null;
  siteId: string | null;
  expiresDays: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PrepaidBalanceRow = {
  id: string;
  packageId: string;
  packageName: string;
  plate: string;
  holderName: string | null;
  remainingMinutes: number;
  purchasedAt: string;
  expiresAt: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function fetchPrepaidPackages(params: {
  site?: string;
  q?: string;
  active?: boolean | null;
  page?: number;
  size?: number;
}): Promise<PaginatedResponse<PrepaidPackageRow>> {
  const u = new URL(`${cfgBase()}/prepaid/packages`);
  if (params.site) u.searchParams.set("site", params.site);
  if (params.q) u.searchParams.set("q", params.q);
  if (params.active !== undefined && params.active !== null)
    u.searchParams.set("active", String(params.active));
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<PaginatedResponse<PrepaidPackageRow>>(u.toString(), {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}

export async function savePrepaidPackage(
  payload: Record<string, unknown>,
  id?: string,
  auditReason?: string,
): Promise<PrepaidPackageRow> {
  const url = id
    ? `${cfgBase()}/prepaid/packages/${id}`
    : `${cfgBase()}/prepaid/packages`;
  return apiFetch<PrepaidPackageRow>(url, {
    method: id ? "PUT" : "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(payload),
  });
}

export async function patchPrepaidPackageStatus(
  id: string,
  active: boolean,
  auditReason?: string,
): Promise<PrepaidPackageRow> {
  return apiFetch<PrepaidPackageRow>(
    `${cfgBase()}/prepaid/packages/${id}/status?active=${active}`,
    {
      method: "PATCH",
      headers: await buildApiHeaders(hdr(auditReason)),
    },
  );
}

export async function fetchPrepaidBalance(plate: string): Promise<PrepaidBalanceRow[]> {
  return apiFetch<PrepaidBalanceRow[]>(
    `${cfgBase()}/prepaid/balance?plate=${encodeURIComponent(plate)}`,
    {
      cache: "no-store",
      headers: await buildApiHeaders(),
    },
  );
}

export async function purchasePrepaidBalance(
  packageId: string,
  plate: string,
  holderName?: string,
  auditReason?: string,
): Promise<PrepaidBalanceRow> {
  return apiFetch<PrepaidBalanceRow>(`${cfgBase()}/prepaid/balance/purchase`, {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify({ packageId, plate, holderName }),
  });
}

export async function deductPrepaidBalance(
  balanceId: string,
  minutes: number,
  auditReason?: string,
): Promise<PrepaidBalanceRow> {
  return apiFetch<PrepaidBalanceRow>(
    `${cfgBase()}/prepaid/balance/${balanceId}/deduct?minutes=${minutes}`,
    {
      method: "PATCH",
      headers: await buildApiHeaders(hdr(auditReason)),
    },
  );
}
