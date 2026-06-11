import { z } from "zod";
import { inferVehicleType, translateVehicleType, validatePlate } from "@/lib/validation/plate-validator";

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
  conditionPhotoUrls: z.string().optional().default(""),
  helmetDelivered: z.boolean().default(false),
  helmetIdentifier: z.string().optional().default(""),
  helmetObservations: z.string().optional().default(""),
  helmetPhotoUrl: z.string().optional().default("")
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

  const inferredType = inferVehicleType(data.countryCode, data.plate);

  if (inferredType && data.type && data.type !== "OTHER" && inferredType !== data.type) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `La placa ingresada corresponde a ${translateVehicleType(inferredType)}. Verifica el tipo de vehículo seleccionado.`,
      path: ["plate"]
    });
    return;
  }

  let typeForValidation = data.type;
  if (!typeForValidation || typeForValidation === "CAR" || typeForValidation === "OTHER") {
    if (inferredType) {
      typeForValidation = inferredType;
    }
  }

  const result = validatePlate(data.countryCode, typeForValidation, data.plate);
  if (!result.isValid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.errorMessage,
      path: ["plate"]
    });
  }
}).superRefine((data, ctx) => {
  if (data.type === "MOTORCYCLE" && data.helmetDelivered && !data.helmetIdentifier?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Número de casco obligatorio cuando se entrega casco",
      path: ["helmetIdentifier"]
    });
  }
});

export type VehicleEntryFormValues = z.infer<typeof vehicleEntrySchema>;
