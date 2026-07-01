import type { UseFormReturn } from "react-hook-form";
import type { VehicleEntryFormValues } from "@/lib/schemas/vehicle.schema";
import type { OperatorSettings } from "./hooks/useOperatorSettings";

export interface UseVehicleEntryOptions {
  form: UseFormReturn<VehicleEntryFormValues>;
  settings: OperatorSettings;
  occupancy: { availableSpaces: number; activeSpaces: number } | null;
  isMotorcycleOnly: boolean;
  onSuccess: (result: {
    ticketNumber: string;
    plate: string;
    previewLines: string[];
    printWarning: string | null;
    spaceCode?: string;
  }) => void;
  onError: (msg: string) => void;
  onOfflineQueued: () => void;
  onIncrementStats: () => void;
  onReloadOccupancy: () => void;
  clearAutoSave: () => void;
}
