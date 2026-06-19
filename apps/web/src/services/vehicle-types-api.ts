import { apiFetch, cfgBase, buildApiHeaders, hdr } from "./_shared";
import { vehicleTypeSchema } from "@/modules/settings/schemas";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";

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

export async function fetchMasterVehicleTypes(
  auditReason?: string,
): Promise<MasterVehicleTypeRow[]> {
  return apiFetch<MasterVehicleTypeRow[]>(`${cfgBase()}/vehicle-types`, {
    cache: "no-store",
    headers: await buildApiHeaders(hdr(auditReason)),
  });
}

export async function saveMasterVehicleType(
  data: {
    code: string;
    name?: string;
    icon?: string;
    color?: string;
    requiresPlate?: boolean;
    hasOwnRate?: boolean;
    quickAccess?: boolean;
    requiresPhoto?: boolean;
    displayOrder?: number;
  },
  id?: string,
  auditReason?: string,
): Promise<MasterVehicleTypeRow> {
  const method = id ? "PUT" : "POST";
  const url = id ? `${cfgBase()}/vehicle-types/${id}` : `${cfgBase()}/vehicle-types`;
  let body: string;
  if (!id) {
    body = JSON.stringify({ code: data.code });
  } else {
    const validatedBody = validatePayloadOrThrow(vehicleTypeSchema, data);
    body = JSON.stringify(validatedBody);
  }
  return apiFetch<MasterVehicleTypeRow>(url, {
    method,
    headers: await buildApiHeaders(hdr(auditReason)),
    body,
  });
}

export async function patchVehicleTypeStatus(
  id: string,
  active: boolean,
  auditReason?: string,
): Promise<void> {
  await apiFetch<void>(`${cfgBase()}/vehicle-types/${id}/status?active=${active}`, {
    method: "PATCH",
    headers: await buildApiHeaders(hdr(auditReason)),
  });
}

export async function deleteVehicleType(id: string, auditReason?: string): Promise<void> {
  await apiFetch<void>(`${cfgBase()}/vehicle-types/${id}`, {
    method: "DELETE",
    headers: await buildApiHeaders(hdr(auditReason)),
  });
}
