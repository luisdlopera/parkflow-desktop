import { apiFetch, apiV1Base, buildApiHeaders, hdr, type SettingsPage } from "./_shared";
import {
  settingsRateStatusSchema,
  settingsRateUpsertSchema,
} from "@/lib/validation/contracts";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";
import type { RateType } from "@/lib/types/parking.types";

export type RoundingMode = "UP" | "DOWN" | "NEAREST";
export type RateCategory = "STANDARD" | "MONTHLY" | "AGREEMENT" | "PREPAID";

export type RateRow = {
  id: string;
  name: string;
  vehicleType: string | null;
  category: RateCategory;
  rateType: RateType;
  amount: number;
  graceMinutes: number;
  toleranceMinutes: number;
  fractionMinutes: number;
  roundingMode: RoundingMode;
  lostTicketSurcharge: number;
  active: boolean;
  site: string;
  siteId: string | null;
  baseValue: number;
  baseMinutes: number;
  additionalValue: number;
  additionalMinutes: number;
  minSessionValue: number | null;
  maxSessionValue: number | null;
  maxDailyValue: number | null;
  appliesNight: boolean;
  nightSurchargePercent: number;
  appliesHoliday: boolean;
  holidaySurchargePercent: number;
  appliesDaysBitmap: number | null;
  windowStart: string | null;
  windowEnd: string | null;
  scheduledActiveFrom: string | null;
  scheduledActiveTo: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchRateById(id: string): Promise<RateRow> {
  return apiFetch<RateRow>(`${apiV1Base()}/settings/rates/${id}`, {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}

export async function fetchRates(params: {
  site?: string;
  q?: string;
  active?: boolean | null;
  page?: number;
  size?: number;
}): Promise<SettingsPage<RateRow>> {
  const u = new URL(`${apiV1Base()}/settings/rates`);
  if (params.site) u.searchParams.set("site", params.site);
  if (params.q) u.searchParams.set("q", params.q);
  if (params.active !== undefined && params.active !== null)
    u.searchParams.set("active", String(params.active));
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<SettingsPage<RateRow>>(u.toString(), {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}

export async function saveRate(
  payload: Record<string, unknown>,
  id?: string,
  auditReason?: string,
): Promise<RateRow> {
  const path = id
    ? `${apiV1Base()}/settings/rates/${id}`
    : `${apiV1Base()}/settings/rates`;
  const validatedBody = validatePayloadOrThrow(settingsRateUpsertSchema, payload);
  return apiFetch<RateRow>(path, {
    method: id ? "PATCH" : "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}

export async function patchRateStatus(
  id: string,
  active: boolean,
  auditReason?: string,
): Promise<RateRow> {
  const validatedBody = validatePayloadOrThrow(settingsRateStatusSchema, { active });
  return apiFetch<RateRow>(`${apiV1Base()}/settings/rates/${id}/status`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}

export async function deleteRate(id: string, auditReason?: string): Promise<void> {
  return apiFetch<void>(`${apiV1Base()}/settings/rates/${id}`, {
    method: "DELETE",
    headers: await buildApiHeaders(hdr(auditReason)),
  });
}
