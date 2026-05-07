import { buildApiHeaders, type AuthHeaderOptions } from "@/lib/api";
import {
  cashRegisterSchema,
  operationalParameterSchema,
  parkingSiteSchema,
  paymentMethodSchema,
  printerSchema,
  rateFractionSchema,
  vehicleTypeSchema
} from "@/modules/settings/schemas";
import {
  settingsLegacySiteSchema,
  settingsParametersSchema,
  settingsPasswordResetSchema,
  settingsRateStatusSchema,
  settingsRateUpsertSchema,
  settingsUserCreateSchema,
  settingsUserPatchSchema,
  settingsUserStatusSchema
} from "@/lib/validation/contracts";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";

function hdr(auditReason?: string): AuthHeaderOptions | undefined {
  const t = auditReason?.trim();
  return t ? { auditReason: t } : undefined;
}
import type { RateType } from "@/modules/parking/types";
import type { UserRole } from "@/modules/users/types";
import type { VehicleType } from "@/modules/parking/types";

export type RoundingMode = "UP" | "DOWN" | "NEAREST";

export type RateRow = {
  id: string;
  name: string;
  vehicleType: string | null;
  rateType: RateType;
  amount: number;
  graceMinutes: number;
  toleranceMinutes: number;
  fractionMinutes: number;
  roundingMode: RoundingMode;
  lostTicketSurcharge: number;
  active: boolean;
  site: string;
  windowStart: string | null;
  windowEnd: string | null;
  scheduledActiveFrom: string | null;
  scheduledActiveTo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserAdminRow = {
  id: string;
  name: string;
  email: string;
  document: string | null;
  phone: string | null;
  role: UserRole;
  site: string | null;
  terminal: string | null;
  active: boolean;
  lastAccessAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ParkingParametersPayload = {
  parkingName?: string;
  taxId?: string;
  address?: string;
  phone?: string;
  siteLabel?: string;
  currency?: string;
  timeZone?: string;
  graceMinutesDefault?: number;
  lostTicketPolicy?: string;
  allowReprint?: boolean;
  maxReprints?: number;
  ticketPrefix?: string;
  ticketFormat?: string;
  defaultPaperWidthMm?: number;
  defaultPrinterName?: string;
  offlineModeEnabled?: boolean;
  syncIntervalSeconds?: number;
  printTimeoutSeconds?: number;
  ticketLegalMessage?: string;
  qrConfig?: string;
  manualExitAllowed?: boolean;
  allowOfflineEntryExit?: boolean;
  /** Override por sede; undefined = hereda app.cash del servidor. */
  cashRequireOpenForPayment?: boolean;
  cashOfflineCloseAllowed?: boolean;
  cashOfflineMaxManualMovement?: number;
};

export type SettingsPage<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

export function apiV1Base(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:6011/api/v1/operations";
  return raw.replace(/\/?operations\/?$/i, "");
}

import { normalizeApiError, handleNetworkError } from "@/lib/errors/normalize-api-error";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw await normalizeApiError(res);
    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "ApiError") throw error;
    throw handleNetworkError(error);
  }
}


export async function fetchRateById(id: string): Promise<RateRow> {
  return apiFetch<RateRow>(`${apiV1Base()}/settings/rates/${id}`, {
    cache: "no-store",
    headers: await buildApiHeaders()
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
  if (params.active !== undefined && params.active !== null) {
    u.searchParams.set("active", String(params.active));
  }
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<SettingsPage<RateRow>>(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
}


export async function saveRate(
  payload: Record<string, unknown>,
  id?: string,
  auditReason?: string
): Promise<RateRow> {
  const path = id ? `${apiV1Base()}/settings/rates/${id}` : `${apiV1Base()}/settings/rates`;
  const validatedBody = validatePayloadOrThrow(settingsRateUpsertSchema, payload);
  return apiFetch<RateRow>(path, {
    method: id ? "PATCH" : "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}


export async function patchRateStatus(
  id: string,
  active: boolean,
  auditReason?: string
): Promise<RateRow> {
  const validatedBody = validatePayloadOrThrow(settingsRateStatusSchema, { active });
  return apiFetch<RateRow>(`${apiV1Base()}/settings/rates/${id}/status`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}


export async function deleteRate(id: string, auditReason?: string): Promise<void> {
  return apiFetch<void>(`${apiV1Base()}/settings/rates/${id}`, {
    method: "DELETE",
    headers: await buildApiHeaders(hdr(auditReason))
  });
}


export async function fetchUserById(id: string): Promise<UserAdminRow> {
  return apiFetch<UserAdminRow>(`${apiV1Base()}/settings/users/${id}`, {
    cache: "no-store",
    headers: await buildApiHeaders()
  });
}


export async function fetchUsers(params: {
  q?: string;
  active?: boolean | null;
  page?: number;
  size?: number;
}): Promise<SettingsPage<UserAdminRow>> {
  const u = new URL(`${apiV1Base()}/settings/users`);
  if (params.q) u.searchParams.set("q", params.q);
  if (params.active !== undefined && params.active !== null) {
    u.searchParams.set("active", String(params.active));
  }
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<SettingsPage<UserAdminRow>>(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
}


export async function createUser(
  payload: Record<string, unknown>,
  auditReason?: string
): Promise<UserAdminRow> {
  const validatedBody = validatePayloadOrThrow(settingsUserCreateSchema, payload);
  return apiFetch<UserAdminRow>(`${apiV1Base()}/settings/users`, {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}


export async function patchUser(
  id: string,
  payload: Record<string, unknown>,
  auditReason?: string
): Promise<UserAdminRow> {
  const validatedBody = validatePayloadOrThrow(settingsUserPatchSchema, payload);
  return apiFetch<UserAdminRow>(`${apiV1Base()}/settings/users/${id}`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}


export async function patchUserStatus(
  id: string,
  active: boolean,
  auditReason?: string
): Promise<UserAdminRow> {
  const validatedBody = validatePayloadOrThrow(settingsUserStatusSchema, { active });
  return apiFetch<UserAdminRow>(`${apiV1Base()}/settings/users/${id}/status`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}


export async function resetUserPassword(
  id: string,
  newPassword: string,
  auditReason?: string
): Promise<void> {
  const validatedBody = validatePayloadOrThrow(settingsPasswordResetSchema, { newPassword });
  return apiFetch<void>(`${apiV1Base()}/settings/users/${id}/reset-password`, {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}


export async function fetchParameters(site?: string): Promise<ParkingParametersPayload> {
  const u = new URL(`${apiV1Base()}/settings/parameters`);
  if (site) u.searchParams.set("site", site);
  return apiFetch<ParkingParametersPayload>(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
}


export type ParametersValidateResult = { ok: boolean; errors: string[] };

export async function validateParameters(
  body: ParkingParametersPayload
): Promise<ParametersValidateResult> {
  const validatedBody = validatePayloadOrThrow(settingsParametersSchema, body);
  return apiFetch<ParametersValidateResult>(`${apiV1Base()}/settings/parameters/validate`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(validatedBody)
  });
}


export async function putParameters(
  body: ParkingParametersPayload,
  site?: string,
  auditReason?: string
): Promise<ParkingParametersPayload> {
  const validatedBody = validatePayloadOrThrow(settingsParametersSchema, body);
  const u = new URL(`${apiV1Base()}/settings/parameters`);
  if (site) u.searchParams.set("site", site);
  return apiFetch<ParkingParametersPayload>(u.toString(), {
    method: "PUT",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}


export async function resetParameters(site?: string, auditReason?: string): Promise<ParkingParametersPayload> {
  const u = new URL(`${apiV1Base()}/settings/parameters/reset`);
  if (site) u.searchParams.set("site", site);
  return apiFetch<ParkingParametersPayload>(u.toString(), {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason))
  });
}


// #region Sites (Sedes) Management
export type SiteRow = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  timeZone: string;
  active: boolean;
  maxCapacity: number | null;
  createdAt: string;
  updatedAt: string;
};

export type SiteCreatePayload = {
  code: string;
  name: string;
  address?: string;
  phone?: string;
  timeZone?: string;
  maxCapacity?: number;
};

export async function fetchSites(params?: { active?: boolean | null }): Promise<SiteRow[]> {
  const u = new URL(`${apiV1Base()}/settings/sites`);
  if (params?.active !== undefined && params.active !== null) {
    u.searchParams.set("active", String(params.active));
  }
  return apiFetch<SiteRow[]>(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
}


export async function createSite(payload: SiteCreatePayload, auditReason?: string): Promise<SiteRow> {
  const validatedBody = validatePayloadOrThrow(settingsLegacySiteSchema, payload);
  return apiFetch<SiteRow>(`${apiV1Base()}/settings/sites`, {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}


export async function updateSite(
  id: string,
  payload: Partial<SiteCreatePayload>,
  auditReason?: string
): Promise<SiteRow> {
  const validatedBody = validatePayloadOrThrow(settingsLegacySiteSchema.partial(), payload);
  return apiFetch<SiteRow>(`${apiV1Base()}/settings/sites/${id}`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}


export async function patchSiteStatus(id: string, active: boolean, auditReason?: string): Promise<SiteRow> {
  const validatedBody = validatePayloadOrThrow(settingsRateStatusSchema, { active });
  return apiFetch<SiteRow>(`${apiV1Base()}/settings/sites/${id}/status`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}

// #endregion

export type MasterVehicleTypeRow = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export async function fetchMasterVehicleTypes(auditReason?: string): Promise<MasterVehicleTypeRow[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace("/operations", "/settings") ?? "http://localhost:6011/api/v1/settings";
  const res = await fetch(`${baseUrl}/vehicle-types`, {
    headers: await buildApiHeaders(hdr(auditReason)),
    cache: "no-store",
    credentials: "include"
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => null);
    throw new Error(`Error obteniendo tipos de vehículo (${res.status}): ${errorBody || res.statusText}`);
  }
  return res.json();
}

export async function saveMasterVehicleType(data: { code: string; name: string; requiresPlate?: boolean; requiresPhoto?: boolean; displayOrder?: number; }, id?: string, auditReason?: string): Promise<MasterVehicleTypeRow> {
  const validatedBody = validatePayloadOrThrow(vehicleTypeSchema, data);
  const method = id ? "PUT" : "POST";
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace("/operations", "/configuration") ?? "http://localhost:6011/api/v1/configuration";
  const url = id 
    ? `${baseUrl}/vehicle-types/${id}`
    : `${baseUrl}/vehicle-types`;
  
  const res = await fetch(url, {
    method,
    headers: { ...(await buildApiHeaders(hdr(auditReason))), "Content-Type": "application/json" },
    body: JSON.stringify(validatedBody)
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => null);
    throw new Error(`Error guardando tipo de vehiculo (${res.status}): ${errorBody || res.statusText}`);
  }
  return res.json();
}

// #region Configuration API (new endpoints)

function cfgBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:6011/api/v1/operations";
  return raw.replace(/\/?operations\/?$/i, "/configuration");
}

import type { ParkingSiteRow, PaymentMethodRow, PrinterRow, OperationalParameterRow, RateFractionRow, CashRegisterRow } from "@/modules/settings/types";

// Parking Sites
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
  if (params.active !== undefined && params.active !== null) u.searchParams.set("active", String(params.active));
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<SettingsPage<ParkingSiteRow>>(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
}

export async function createConfigurationSite(payload: Record<string, unknown>, companyId: string, auditReason?: string): Promise<ParkingSiteRow> {
  const validatedBody = validatePayloadOrThrow(parkingSiteSchema, payload);
  const u = new URL(`${cfgBase()}/parking-sites`);
  u.searchParams.set("companyId", companyId);
  return apiFetch<ParkingSiteRow>(u.toString(), {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}

export async function updateConfigurationSite(id: string, payload: Record<string, unknown>, auditReason?: string): Promise<ParkingSiteRow> {
  const validatedBody = validatePayloadOrThrow(parkingSiteSchema.partial(), payload);
  return apiFetch<ParkingSiteRow>(`${cfgBase()}/parking-sites/${id}`, {
    method: "PUT",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}

export async function patchConfigurationSiteStatus(id: string, active: boolean, auditReason?: string): Promise<ParkingSiteRow> {
  return apiFetch<ParkingSiteRow>(`${cfgBase()}/parking-sites/${id}/status?active=${active}`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason))
  });
}

// Payment Methods
export async function fetchConfigurationPaymentMethods(params: {
  q?: string;
  active?: boolean | null;
  page?: number;
  size?: number;
}): Promise<SettingsPage<PaymentMethodRow>> {
  const u = new URL(`${cfgBase()}/payment-methods`);
  if (params.q) u.searchParams.set("q", params.q);
  if (params.active !== undefined && params.active !== null) u.searchParams.set("active", String(params.active));
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<SettingsPage<PaymentMethodRow>>(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
}

export async function createConfigurationPaymentMethod(payload: Record<string, unknown>, auditReason?: string): Promise<PaymentMethodRow> {
  const validatedBody = validatePayloadOrThrow(paymentMethodSchema, payload);
  return apiFetch<PaymentMethodRow>(`${cfgBase()}/payment-methods`, {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}

export async function updateConfigurationPaymentMethod(id: string, payload: Record<string, unknown>, auditReason?: string): Promise<PaymentMethodRow> {
  const validatedBody = validatePayloadOrThrow(paymentMethodSchema.partial(), payload);
  return apiFetch<PaymentMethodRow>(`${cfgBase()}/payment-methods/${id}`, {
    method: "PUT",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}

export async function patchConfigurationPaymentMethodStatus(id: string, active: boolean, auditReason?: string): Promise<PaymentMethodRow> {
  return apiFetch<PaymentMethodRow>(`${cfgBase()}/payment-methods/${id}/status?active=${active}`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason))
  });
}

// Printers
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
  if (params.active !== undefined && params.active !== null) u.searchParams.set("active", String(params.active));
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<SettingsPage<PrinterRow>>(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
}

export async function createConfigurationPrinter(payload: Record<string, unknown>, siteId: string, auditReason?: string): Promise<PrinterRow> {
  const validatedBody = validatePayloadOrThrow(printerSchema, payload);
  const u = new URL(`${cfgBase()}/printers`);
  u.searchParams.set("siteId", siteId);
  return apiFetch<PrinterRow>(u.toString(), {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}

export async function updateConfigurationPrinter(id: string, payload: Record<string, unknown>, auditReason?: string): Promise<PrinterRow> {
  const validatedBody = validatePayloadOrThrow(printerSchema.partial(), payload);
  return apiFetch<PrinterRow>(`${cfgBase()}/printers/${id}`, {
    method: "PUT",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}

export async function patchConfigurationPrinterStatus(id: string, active: boolean, auditReason?: string): Promise<PrinterRow> {
  return apiFetch<PrinterRow>(`${cfgBase()}/printers/${id}/status?active=${active}`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason))
  });
}

// Operational Parameters
export async function fetchConfigurationOperationalParameters(siteId: string): Promise<OperationalParameterRow> {
  const u = new URL(`${cfgBase()}/operational-parameters`);
  u.searchParams.set("siteId", siteId);
  return apiFetch<OperationalParameterRow>(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
}

export async function putConfigurationOperationalParameters(siteId: string, payload: Record<string, unknown>, auditReason?: string): Promise<OperationalParameterRow> {
  const validatedBody = validatePayloadOrThrow(operationalParameterSchema, payload);
  const u = new URL(`${cfgBase()}/operational-parameters`);
  u.searchParams.set("siteId", siteId);
  return apiFetch<OperationalParameterRow>(u.toString(), {
    method: "PUT",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}

// Rate Fractions
export async function fetchConfigurationRateFractions(rateId: string): Promise<RateFractionRow[]> {
  const u = new URL(`${cfgBase()}/rate-fractions`);
  u.searchParams.set("rateId", rateId);
  return apiFetch<RateFractionRow[]>(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
}

export async function createConfigurationRateFraction(rateId: string, payload: Record<string, unknown>, auditReason?: string): Promise<RateFractionRow> {
  const validatedBody = validatePayloadOrThrow(rateFractionSchema, payload);
  const u = new URL(`${cfgBase()}/rate-fractions`);
  u.searchParams.set("rateId", rateId);
  return apiFetch<RateFractionRow>(u.toString(), {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}

export async function updateConfigurationRateFraction(id: string, payload: Record<string, unknown>, auditReason?: string): Promise<RateFractionRow> {
  const validatedBody = validatePayloadOrThrow(rateFractionSchema, payload);
  return apiFetch<RateFractionRow>(`${cfgBase()}/rate-fractions/${id}`, {
    method: "PUT",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}

export async function deleteConfigurationRateFraction(id: string, auditReason?: string): Promise<void> {
  return apiFetch<void>(`${cfgBase()}/rate-fractions/${id}`, {
    method: "DELETE",
    headers: await buildApiHeaders(hdr(auditReason))
  });
}

// Cash Registers
export async function fetchConfigurationCashRegisters(params: {
  siteId?: string;
  q?: string;
  active?: boolean | null;
  page?: number;
  size?: number;
}): Promise<SettingsPage<CashRegisterRow>> {
  const u = new URL(`${cfgBase()}/cash-registers`);
  if (params.siteId) u.searchParams.set("siteId", params.siteId);
  if (params.q) u.searchParams.set("q", params.q);
  if (params.active !== undefined && params.active !== null) u.searchParams.set("active", String(params.active));
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<SettingsPage<CashRegisterRow>>(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
}

export async function createConfigurationCashRegister(payload: Record<string, unknown>, auditReason?: string): Promise<CashRegisterRow> {
  const validatedBody = validatePayloadOrThrow(cashRegisterSchema, payload);
  return apiFetch<CashRegisterRow>(`${cfgBase()}/cash-registers`, {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}

export async function updateConfigurationCashRegister(id: string, payload: Record<string, unknown>, auditReason?: string): Promise<CashRegisterRow> {
  const validatedBody = validatePayloadOrThrow(cashRegisterSchema.partial(), payload);
  return apiFetch<CashRegisterRow>(`${cfgBase()}/cash-registers/${id}`, {
    method: "PUT",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}

export async function patchConfigurationCashRegisterStatus(id: string, active: boolean, auditReason?: string): Promise<CashRegisterRow> {
  return apiFetch<CashRegisterRow>(`${cfgBase()}/cash-registers/${id}/status?active=${active}`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason))
  });
}

// #endregion
