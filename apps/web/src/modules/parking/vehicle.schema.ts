import { z } from "zod";

export const vehicleEntrySchema = z.object({
  plate: z.string().min(5, "Placa obligatoria"),
  type: z.enum(["CAR", "MOTORCYCLE", "VAN", "TRUCK", "OTHER"]),
  rateId: z.string().optional().default("")
});

export type VehicleEntryFormValues = z.infer<typeof vehicleEntrySchema>;
