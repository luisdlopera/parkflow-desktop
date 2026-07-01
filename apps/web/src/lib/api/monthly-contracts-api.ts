import { apiFetch, cfgBase, buildApiHeaders, hdr } from "./_shared";
import type { PaginatedResponse } from "@/lib/types/api.types";

export type MonthlyContractRow = {
  id: string;
  rateId: string;
  rateName: string | null;
  plate: string;
  vehicleType: string | null;
  holderName: string;
  holderDocument: string | null;
  holderPhone: string | null;
  holderEmail: string | null;
  site: string;
  siteId: string | null;
  startDate: string;
  endDate: string;
  amount: number;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchMonthlyContracts(params: {
  site?: string;
  plate?: string;
  active?: boolean | null;
  page?: number;
  size?: number;
}): Promise<PaginatedResponse<MonthlyContractRow>> {
  const u = new URL(`${cfgBase()}/monthly-contracts`);
  if (params.site) u.searchParams.set("site", params.site);
  if (params.plate) u.searchParams.set("plate", params.plate);
  if (params.active !== undefined && params.active !== null)
    u.searchParams.set("active", String(params.active));
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<PaginatedResponse<MonthlyContractRow>>(u.toString(), {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}

export async function saveMonthlyContract(
  payload: Record<string, unknown>,
  id?: string,
  auditReason?: string,
): Promise<MonthlyContractRow> {
  const url = id
    ? `${cfgBase()}/monthly-contracts/${id}`
    : `${cfgBase()}/monthly-contracts`;
  return apiFetch<MonthlyContractRow>(url, {
    method: id ? "PUT" : "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(payload),
  });
}

export async function patchMonthlyContractStatus(
  id: string,
  active: boolean,
  auditReason?: string,
): Promise<MonthlyContractRow> {
  return apiFetch<MonthlyContractRow>(
    `${cfgBase()}/monthly-contracts/${id}/status?active=${active}`,
    {
      method: "PATCH",
      headers: await buildApiHeaders(hdr(auditReason)),
    },
  );
}
