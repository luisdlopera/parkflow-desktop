import { buildApiHeaders, type AuthHeaderOptions } from "@/lib/api";

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
  vehicleType: VehicleType | null;
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

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    const msg = body.error ?? "";

    // Mensajes específicos para errores comunes
    if (response.status === 401) {
      return msg || "Sesión expirada. Por favor inicie sesión nuevamente.";
    }
    if (response.status === 403) {
      return msg || "No tiene permisos para realizar esta operación. Contacte al administrador.";
    }
    if (response.status === 404) {
      return msg || "Recurso no encontrado.";
    }
    if (response.status === 409) {
      return msg || "Conflicto: el recurso ya existe o hay una operación en curso.";
    }
    if (response.status >= 500) {
      return msg || "Error del servidor. Intente nuevamente más tarde.";
    }

    return msg || `Error HTTP ${response.status}`;
  } catch {
    if (response.status === 403) {
      return "No tiene permisos para realizar esta operación.";
    }
    if (response.status === 401) {
      return "Sesión expirada. Por favor inicie sesión nuevamente.";
    }
    return `Error HTTP ${response.status}`;
  }
}

export async function fetchRateById(id: string): Promise<RateRow> {
  const res = await fetch(`${apiV1Base()}/settings/rates/${id}`, {
    cache: "no-store",
    headers: await buildApiHeaders()
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as RateRow;
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
  const res = await fetch(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SettingsPage<RateRow>;
}

export async function saveRate(
  payload: Record<string, unknown>,
  id?: string,
  auditReason?: string
): Promise<RateRow> {
  const path = id ? `${apiV1Base()}/settings/rates/${id}` : `${apiV1Base()}/settings/rates`;
  const res = await fetch(path, {
    method: id ? "PATCH" : "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as RateRow;
}

export async function patchRateStatus(
  id: string,
  active: boolean,
  auditReason?: string
): Promise<RateRow> {
  const res = await fetch(`${apiV1Base()}/settings/rates/${id}/status`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify({ active })
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as RateRow;
}

export async function deleteRate(id: string, auditReason?: string): Promise<void> {
  const res = await fetch(`${apiV1Base()}/settings/rates/${id}`, {
    method: "DELETE",
    headers: await buildApiHeaders(hdr(auditReason))
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function fetchUserById(id: string): Promise<UserAdminRow> {
  const res = await fetch(`${apiV1Base()}/settings/users/${id}`, {
    cache: "no-store",
    headers: await buildApiHeaders()
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as UserAdminRow;
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
  const res = await fetch(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SettingsPage<UserAdminRow>;
}

export async function createUser(
  payload: Record<string, unknown>,
  auditReason?: string
): Promise<UserAdminRow> {
  const res = await fetch(`${apiV1Base()}/settings/users`, {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as UserAdminRow;
}

export async function patchUser(
  id: string,
  payload: Record<string, unknown>,
  auditReason?: string
): Promise<UserAdminRow> {
  const res = await fetch(`${apiV1Base()}/settings/users/${id}`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as UserAdminRow;
}

export async function patchUserStatus(
  id: string,
  active: boolean,
  auditReason?: string
): Promise<UserAdminRow> {
  const res = await fetch(`${apiV1Base()}/settings/users/${id}/status`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify({ active })
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as UserAdminRow;
}

export async function resetUserPassword(
  id: string,
  newPassword: string,
  auditReason?: string
): Promise<void> {
  const res = await fetch(`${apiV1Base()}/settings/users/${id}/reset-password`, {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify({ newPassword })
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function fetchParameters(site?: string): Promise<ParkingParametersPayload> {
  const u = new URL(`${apiV1Base()}/settings/parameters`);
  if (site) u.searchParams.set("site", site);
  const res = await fetch(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ParkingParametersPayload;
}

export type ParametersValidateResult = { ok: boolean; errors: string[] };

export async function validateParameters(
  body: ParkingParametersPayload
): Promise<ParametersValidateResult> {
  const res = await fetch(`${apiV1Base()}/settings/parameters/validate`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ParametersValidateResult;
}

export async function putParameters(
  body: ParkingParametersPayload,
  site?: string,
  auditReason?: string
): Promise<ParkingParametersPayload> {
  const u = new URL(`${apiV1Base()}/settings/parameters`);
  if (site) u.searchParams.set("site", site);
  const res = await fetch(u.toString(), {
    method: "PUT",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ParkingParametersPayload;
}

export async function resetParameters(site?: string, auditReason?: string): Promise<ParkingParametersPayload> {
  const u = new URL(`${apiV1Base()}/settings/parameters/reset`);
  if (site) u.searchParams.set("site", site);
  const res = await fetch(u.toString(), {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason))
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ParkingParametersPayload;
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
  const res = await fetch(u.toString(), { cache: "no-store", headers: await buildApiHeaders() });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SiteRow[];
}

export async function createSite(payload: SiteCreatePayload, auditReason?: string): Promise<SiteRow> {
  const res = await fetch(`${apiV1Base()}/settings/sites`, {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SiteRow;
}

export async function updateSite(
  id: string,
  payload: Partial<SiteCreatePayload>,
  auditReason?: string
): Promise<SiteRow> {
  const res = await fetch(`${apiV1Base()}/settings/sites/${id}`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SiteRow;
}

export async function patchSiteStatus(id: string, active: boolean, auditReason?: string): Promise<SiteRow> {
  const res = await fetch(`${apiV1Base()}/settings/sites/${id}/status`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify({ active })
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SiteRow;
}
// #endregion
