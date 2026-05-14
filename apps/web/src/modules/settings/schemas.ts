import { z } from "zod";

export const parkingSiteSchema = z.object({
  code: z.string().min(2, "Mínimo 2 caracteres").max(20, "Máximo 20 caracteres"),
  name: z.string().min(3, "Mínimo 3 caracteres").max(120, "Máximo 120 caracteres"),
  address: z.string().max(300, "Máximo 300 caracteres").optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  managerName: z.string().max(150).optional().or(z.literal("")),
  timezone: z.string().min(1).max(50).default("America/Bogota"),
  currency: z.string().min(1).max(10).default("COP"),
  maxCapacity: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const paymentMethodSchema = z.object({
  code: z.string().min(1).max(20).regex(/^[A-Z0-9_]+$/, "Solo mayúsculas, números y guión bajo"),
  name: z.string().min(1).max(100),
  requiresReference: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});

export const printerSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(["THERMAL", "PDF", "OS"]),
  connection: z.enum(["USB", "NET", "BLUETOOTH", "LOCAL_AGENT"]),
  paperWidthMm: z.union([z.literal(58), z.literal(80)]).default(80),
  endpointOrDevice: z.string().max(255).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export const operationalParameterSchema = z.object({
  timezone: z.string().default("America/Bogota"),
  allowEntryWithoutPrinter: z.boolean().default(false),
  allowExitWithoutPayment: z.boolean().default(false),
  allowReprint: z.boolean().default(true),
  allowVoid: z.boolean().default(true),
  requirePhotoEntry: z.boolean().default(false),
  requirePhotoExit: z.boolean().default(false),
  toleranceMinutes: z.number().int().min(0).default(0),
  maxTimeNoCharge: z.number().int().min(0).default(0),
  legalMessage: z.string().max(1000).optional().or(z.literal("")),
  offlineModeEnabled: z.boolean().default(true),
});

export const rateFractionSchema = z.object({
  fromMinute: z.number().int().min(0),
  toMinute: z.number().int().min(1),
  value: z.number().min(0),
  roundUp: z.boolean().default(true),
  isActive: z.boolean().default(true),
}).refine((data) => data.fromMinute < data.toMinute, {
  message: "El minuto inicial debe ser menor al final",
  path: ["toMinute"],
});

export const cashRegisterSchema = z.object({
  site: z.string().min(1).max(80),
  siteId: z.string().uuid().optional().or(z.literal("")),
  code: z.string().min(1).max(20),
  name: z.string().max(120).optional().or(z.literal("")),
  terminal: z.string().min(1).max(80),
  label: z.string().max(120).optional().or(z.literal("")),
  printerId: z.string().uuid().optional().or(z.literal("")),
  responsibleUserId: z.string().uuid().optional().or(z.literal("")),
  active: z.boolean().default(true),
});

export const vehicleTypeSchema = z.object({
  code: z.string().min(1).max(20).regex(/^[A-Z0-9_]+$/, "Solo mayúsculas, números y guión bajo"),
  name: z.string().min(1).max(100),
  icon: z.string().max(40).optional().or(z.literal("")),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color hexadecimal, ej. #2563EB").default("#2563EB"),
  requiresPlate: z.boolean().default(true),
  hasOwnRate: z.boolean().default(true),
  quickAccess: z.boolean().default(true),
  requiresPhoto: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
});

export type ParkingSiteSchema = z.infer<typeof parkingSiteSchema>;
export type PaymentMethodSchema = z.infer<typeof paymentMethodSchema>;
export type PrinterSchema = z.infer<typeof printerSchema>;
export type OperationalParameterSchema = z.infer<typeof operationalParameterSchema>;
export type RateFractionSchema = z.infer<typeof rateFractionSchema>;
export type CashRegisterSchema = z.infer<typeof cashRegisterSchema>;
export type VehicleTypeSchema = z.infer<typeof vehicleTypeSchema>;
