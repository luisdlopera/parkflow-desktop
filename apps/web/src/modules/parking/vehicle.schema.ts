import { z } from "zod";

export const vehicleEntrySchema = z.object({
  plate: z.string().min(5, "Placa obligatoria"),
  type: z.string().min(1, "Tipo de vehículo obligatorio"),
  rateId: z.string().optional().default(""),
  site: z.string().optional().default(""),
  lane: z.string().optional().default(""),
  booth: z.string().optional().default(""),
  terminal: z.string().optional().default(""),
  observations: z.string().optional().default(""),
  vehicleCondition: z.string().min(3, "Describe el estado del vehiculo"),
  conditionChecklist: z.string().optional().default(""),
  conditionPhotoUrls: z.string().optional().default("")
});

export type VehicleEntryFormValues = z.infer<typeof vehicleEntrySchema>;
