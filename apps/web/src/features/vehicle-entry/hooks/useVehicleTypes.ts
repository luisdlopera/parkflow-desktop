"use client";
import { useState, useEffect } from "react";
import { fetchMasterVehicleTypes, type MasterVehicleTypeRow } from "@/lib/settings-api";

const FALLBACK_TYPES: MasterVehicleTypeRow[] = [
  { id: "fallback-car", code: "CAR", name: "Carro", isActive: true },
  { id: "fallback-moto", code: "MOTORCYCLE", name: "Moto", isActive: true },
  { id: "fallback-bicycle", code: "BICYCLE", name: "Bicicleta", isActive: true, requiresPlate: false },
  { id: "fallback-van", code: "VAN", name: "Van", isActive: true },
  { id: "fallback-truck", code: "TRUCK", name: "Camión", isActive: true },
  { id: "fallback-bus", code: "BUS", name: "Bus", isActive: true },
  { id: "fallback-electric", code: "ELECTRIC", name: "Eléctrico", isActive: true },
  { id: "fallback-other", code: "OTHER", name: "Otro", isActive: true },
];

function sortedActive(types: MasterVehicleTypeRow[]) {
  return types
    .filter((t) => t.isActive)
    .sort(
      (a, b) =>
        (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name),
    );
}

export function useVehicleTypes(allowedCodes?: string[]) {
  const [vehicleTypes, setVehicleTypes] = useState<MasterVehicleTypeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchMasterVehicleTypes()
      .then((types) => {
        if (cancelled) return;
        let active = sortedActive(types.length > 0 ? types : FALLBACK_TYPES);
        if (allowedCodes && allowedCodes.length > 0) {
          active = active.filter((t) => allowedCodes.includes(t.code));
        }
        setVehicleTypes(active);
      })
      .catch(() => {
        if (cancelled) return;
        let fallback = sortedActive(FALLBACK_TYPES);
        if (allowedCodes && allowedCodes.length > 0) {
          fallback = fallback.filter((t) => allowedCodes.includes(t.code));
        }
        setVehicleTypes(fallback);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [allowedCodes?.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { vehicleTypes, loading };
}
