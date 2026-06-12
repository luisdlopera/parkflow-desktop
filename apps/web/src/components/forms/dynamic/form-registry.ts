import { HelmetSection } from "./fields/HelmetSection";
import { VehicleConditionInput } from "./fields/VehicleConditionInput";
import { ObservationsInput } from "./fields/ObservationsInput";

export const EntryFormRegistry = {
  helmet_section: HelmetSection,
  vehicle_condition: VehicleConditionInput,
  observations: ObservationsInput,
} as const;

export type RegisteredFieldKey = keyof typeof EntryFormRegistry;
