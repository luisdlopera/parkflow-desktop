import { z } from "zod";
import { validatePlate } from "@/lib/validation/plate-validator";

export const vehicleEntrySchema = z.object({
  plate: z.string().optional().default(""),
  type: z.string().min(1, "Tipo de vehículo obligatorio"),
  countryCode: z.string().length(2).default("CO"),
  entryMode: z.enum(["VISITOR", "AGREEMENT", "SUBSCRIBER", "EMPLOYEE"]).default("VISITOR"),
  noPlate: z.boolean().default(false),
  noPlateReason: z.string().max(200).optional().default(""),
  rateId: z.string().optional().default(""),
  site: z.string().optional().default(""),
  lane: z.string().optional().default(""),
  booth: z.string().optional().default(""),
  terminal: z.string().optional().default(""),
  observations: z.string().optional().default(""),
  vehicleCondition: z.string().min(3, "Describe el estado del vehiculo"),
  conditionChecklist: z.string().optional().default(""),
  conditionPhotoUrls: z.string().optional().default("")
}).superRefine((data, ctx) => {
  if (data.noPlate) {
    if (!data.noPlateReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Justifica el ingreso sin placa",
        path: ["noPlateReason"]
      });
    }
    return;
  }

  if (!data.plate?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Placa obligatoria",
      path: ["plate"]
    });
    return;
  }

  const result = validatePlate(data.countryCode, data.type, data.plate);
  if (!result.isValid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.errorMessage,
      path: ["plate"]
    });
  }
});

export type VehicleEntryFormValues = z.infer<typeof vehicleEntrySchema>;
