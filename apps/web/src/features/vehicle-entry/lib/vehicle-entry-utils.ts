import type { VehicleType } from "@parkflow/types";
import { inferVehicleType } from "@/lib/validation/plate-validator";
import type { VehicleEntryFormValues } from "@/lib/schemas/vehicle.schema";
import type { OperatorSettings } from "../hooks/useOperatorSettings";

export function resolveVehicleType(type: string, countryCode: string, plate: string): VehicleType {
  if (!type || type === "CAR" || type === "OTHER") {
    const inferred = inferVehicleType(countryCode, plate);
    if (inferred) return inferred as VehicleType;
  }
  return type as VehicleType;
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("network") || msg.includes("fetch") || msg.includes("connection") || msg.includes("offline");
  }
  return false;
}

export function buildFormResetValues(
  values: VehicleEntryFormValues,
  settings: OperatorSettings,
  isMotorcycleOnly: boolean,
): Partial<VehicleEntryFormValues> {
  return {
    plate: "",
    type: isMotorcycleOnly ? "MOTORCYCLE" : settings.defaultVehicleType,
    countryCode: values.countryCode || "CO",
    entryMode: "VISITOR",
    noPlate: false,
    noPlateReason: "",
    rateId: "",
    site: settings.rememberLocation ? values.site : "Principal",
    lane: settings.rememberLocation ? values.lane : "",
    booth: settings.rememberLocation ? values.booth : "",
    terminal: settings.rememberLocation ? values.terminal : "",
    observations: "",
    vehicleCondition: settings.skipConditionCheck ? "" : "Sin novedades al ingreso",
    conditionChecklist: "",
    conditionPhotoUrls: "",
    custodiedItems: [],
  };
}
