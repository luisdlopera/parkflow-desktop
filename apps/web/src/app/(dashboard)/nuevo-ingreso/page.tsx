"use client";

import { useSearchParams } from "next/navigation";
import VehicleEntryFormV2 from "@/components/forms/VehicleEntryFormV2";

export default function NuevoIngresoPage() {
  const searchParams = useSearchParams();
  const plate = searchParams?.get("plate")?.trim().toUpperCase() ?? "";

  return (
    <div className="max-w-2xl">
      <VehicleEntryFormV2 initialPlate={plate} disableRecovery={Boolean(plate)} />
    </div>
  );
}
