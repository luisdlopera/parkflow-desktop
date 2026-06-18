import { z } from "zod";
import { requiredString, positiveNumber, nonNegativeNumber } from "@/lib/validation";

export const companySchema = z.object({
  name: requiredString("Ingresa el nombre de la empresa."),
  nit: z.string().optional().or(z.literal("")),
  email: z.string().email({ message: "Ingresa un correo electrónico válido." }).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  contactName: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  plan: z.enum(["LOCAL", "SYNC", "PRO", "ENTERPRISE"] as const),
  maxDevices: positiveNumber("Mínimo 1 dispositivo."),
  maxLocations: positiveNumber("Mínimo 1 sede."),
  maxUsers: positiveNumber("Mínimo 1 usuario."),
  trialDays: nonNegativeNumber("Días de prueba inválidos."),
  offlineModeAllowed: z.boolean(),
});

export type CompanySchema = z.infer<typeof companySchema>;
