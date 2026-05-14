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
  // Estructura base
  baseValue: number;
  baseMinutes: number;
  additionalValue: number;
  additionalMinutes: number;
  // Topes
  minSessionValue: number | null;
  maxSessionValue: number | null;
  maxDailyValue: number | null;
  // Noche y festivos
  appliesNight: boolean;
  nightSurchargePercent: number;
  appliesHoliday: boolean;
  holidaySurchargePercent: number;
  // Días de la semana (bitmap: bit0=Lun..bit6=Dom; null=todos)
  appliesDaysBitmap: number | null;
  // Franja horaria
  windowStart: string | null;
  windowEnd: string | null;
  // Vigencia programada
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
  logoUrl?: string;
  brandColor?: string;
  taxName?: string;
  taxRatePercent?: number;
  pricesIncludeTax?: boolean;
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
  ticketHeaderMessage?: string;
  ticketLegalMessage?: string;
  ticketFooterMessage?: string;
  operationRulesMessage?: string;
  qrConfig?: string;
  manualExitAllowed?: boolean;
  allowOfflineEntryExit?: boolean;
  /** Override por sede; undefined = hereda app.cash del servidor. */
  cashRequireOpenForPayment?: boolean;
  cashOfflineCloseAllowed?: boolean;
  cashOfflineMaxManualMovement?: number;
  businessLegalName?: string;
  taxIdCheckDigit?: string;
  dianInvoicePrefix?: string;
  dianResolutionNumber?: string;
  dianResolutionDate?: string;
  dianRangeFrom?: string;
  dianRangeTo?: string;
  dianTechnicalKey?: string;
  cashFeSequentialEnabled?: boolean;
  cashFeSequencePerTerminal?: boolean;
  cashFeSequenceDigits?: number;
  cashFeOutboundWebhookUrl?: string;
  cashFeOutboundWebhookBearer?: string;
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


export type MasterVehicleTypeRow = {
  id: string;
  code: string;
  name: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  requiresPlate?: boolean;
  hasOwnRate?: boolean;
  quickAccess?: boolean;
  requiresPhoto?: boolean;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchMasterVehicleTypes(auditReason?: string): Promise<MasterVehicleTypeRow[]> {
  return apiFetch<MasterVehicleTypeRow[]>(`${cfgBase()}/vehicle-types`, {
    cache: "no-store",
    headers: await buildApiHeaders(hdr(auditReason))
  });
}

export async function saveMasterVehicleType(data: { code: string; name: string; icon?: string; color?: string; requiresPlate?: boolean; hasOwnRate?: boolean; quickAccess?: boolean; requiresPhoto?: boolean; displayOrder?: number; }, id?: string, auditReason?: string): Promise<MasterVehicleTypeRow> {
  const validatedBody = validatePayloadOrThrow(vehicleTypeSchema, data);
  const method = id ? "PUT" : "POST";
  const url = id 
    ? `${cfgBase()}/vehicle-types/${id}`
    : `${cfgBase()}/vehicle-types`;

  return apiFetch<MasterVehicleTypeRow>(url, {
    method,
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody)
  });
}

export async function patchVehicleTypeStatus(id: string, active: boolean, auditReason?: string): Promise<void> {
  await apiFetch<void>(`${cfgBase()}/vehicle-types/${id}/status?active=${active}`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason))
  });
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

// =============================================================================
// Monthly Contracts
// =============================================================================

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
}): Promise<SettingsPage<MonthlyContractRow>> {
  const u = new URL(`${cfgBase()}/monthly-contracts`);
  if (params.site) u.searchParams.set("site", params.site);
  if (params.plate) u.searchParams.set("plate", params.plate);
  if (params.active !== undefined && params.active !== null) u.searchParams.set("active", String(params.active));
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<SettingsPage<MonthlyContractRow>>(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
}

export async function saveMonthlyContract(
  payload: Record<string, unknown>,
  id?: string,
  auditReason?: string
): Promise<MonthlyContractRow> {
  const url = id ? `${cfgBase()}/monthly-contracts/${id}` : `${cfgBase()}/monthly-contracts`;
  return apiFetch<MonthlyContractRow>(url, {
    method: id ? "PUT" : "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(payload)
  });
}

export async function patchMonthlyContractStatus(id: string, active: boolean, auditReason?: string): Promise<MonthlyContractRow> {
  return apiFetch<MonthlyContractRow>(`${cfgBase()}/monthly-contracts/${id}/status?active=${active}`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason))
  });
}

// =============================================================================
// Agreements (Convenios)
// =============================================================================

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
}): Promise<SettingsPage<AgreementRow>> {
  const u = new URL(`${cfgBase()}/agreements`);
  if (params.site) u.searchParams.set("site", params.site);
  if (params.q) u.searchParams.set("q", params.q);
  if (params.active !== undefined && params.active !== null) u.searchParams.set("active", String(params.active));
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<SettingsPage<AgreementRow>>(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
}

export async function resolveAgreementByCode(code: string): Promise<AgreementRow> {
  return apiFetch<AgreementRow>(`${cfgBase()}/agreements/resolve?code=${encodeURIComponent(code)}`, {
    cache: "no-store",
    headers: await buildApiHeaders()
  });
}

export async function saveAgreement(
  payload: Record<string, unknown>,
  id?: string,
  auditReason?: string
): Promise<AgreementRow> {
  const url = id ? `${cfgBase()}/agreements/${id}` : `${cfgBase()}/agreements`;
  return apiFetch<AgreementRow>(url, {
    method: id ? "PUT" : "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(payload)
  });
}

export async function patchAgreementStatus(id: string, active: boolean, auditReason?: string): Promise<AgreementRow> {
  return apiFetch<AgreementRow>(`${cfgBase()}/agreements/${id}/status?active=${active}`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason))
  });
}

// =============================================================================
// Prepaid Packages & Balances
// =============================================================================

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
}): Promise<SettingsPage<PrepaidPackageRow>> {
  const u = new URL(`${cfgBase()}/prepaid/packages`);
  if (params.site) u.searchParams.set("site", params.site);
  if (params.q) u.searchParams.set("q", params.q);
  if (params.active !== undefined && params.active !== null) u.searchParams.set("active", String(params.active));
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<SettingsPage<PrepaidPackageRow>>(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
}

export async function savePrepaidPackage(
  payload: Record<string, unknown>,
  id?: string,
  auditReason?: string
): Promise<PrepaidPackageRow> {
  const url = id ? `${cfgBase()}/prepaid/packages/${id}` : `${cfgBase()}/prepaid/packages`;
  return apiFetch<PrepaidPackageRow>(url, {
    method: id ? "PUT" : "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(payload)
  });
}

export async function patchPrepaidPackageStatus(id: string, active: boolean, auditReason?: string): Promise<PrepaidPackageRow> {
  return apiFetch<PrepaidPackageRow>(`${cfgBase()}/prepaid/packages/${id}/status?active=${active}`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason))
  });
}

export async function fetchPrepaidBalance(plate: string): Promise<PrepaidBalanceRow[]> {
  return apiFetch<PrepaidBalanceRow[]>(`${cfgBase()}/prepaid/balance?plate=${encodeURIComponent(plate)}`, {
    cache: "no-store",
    headers: await buildApiHeaders()
  });
}

export async function purchasePrepaidBalance(
  packageId: string,
  plate: string,
  holderName?: string,
  auditReason?: string
): Promise<PrepaidBalanceRow> {
  return apiFetch<PrepaidBalanceRow>(`${cfgBase()}/prepaid/balance/purchase`, {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify({ packageId, plate, holderName })
  });
}

export async function deductPrepaidBalance(
  balanceId: string,
  minutes: number,
  auditReason?: string
): Promise<PrepaidBalanceRow> {
  return apiFetch<PrepaidBalanceRow>(`${cfgBase()}/prepaid/balance/${balanceId}/deduct?minutes=${minutes}`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason))
  });
}
