import { z } from "zod";
import type { PrintDocumentType } from "@parkflow/types";

const PLATE_RE = /^[A-Z0-9-]+$/;
const paymentMethodSchema = z.enum([
  "CASH",
  "DEBIT_CARD",
  "CREDIT_CARD",
  "CARD",
  "QR",
  "NEQUI",
  "DAVIPLATA",
  "TRANSFER",
  "AGREEMENT",
  "INTERNAL_CREDIT",
  "OTHER",
  "MIXED"
]);

export const operationEntryRequestSchema = z.object({
  idempotencyKey: z.string().max(200).optional(),
  plate: z.string().max(20).regex(PLATE_RE, "La placa solo permite A-Z, 0-9 y guion").nullable().optional(),
  type: z.string().min(1),
  countryCode: z.string().length(2).optional(),
  entryMode: z.enum(["VISITOR", "AGREEMENT", "SUBSCRIBER", "EMPLOYEE"]).optional(),
  noPlate: z.boolean().optional(),
  noPlateReason: z.string().max(200).nullable().optional(),
  operatorUserId: z.string().uuid(),
  rateId: z.string().uuid().nullable().optional(),
  site: z.string().max(100).nullable().optional(),
  lane: z.string().max(50).nullable().optional(),
  booth: z.string().max(50).nullable().optional(),
  terminal: z.string().max(50).nullable().optional(),
  observations: z.string().max(500).nullable().optional(),
  vehicleCondition: z.string().max(200).nullable().optional(),
  conditionChecklist: z.array(z.string().max(100)).optional(),
  conditionPhotoUrls: z.array(z.string().max(500)).optional()
}).refine((v) => Boolean(v.noPlate) || Boolean(v.plate?.trim()), {
  message: "Placa obligatoria salvo ingreso especial sin placa",
  path: ["plate"]
});

export const operationExitRequestSchema = z
  .object({
    idempotencyKey: z.string().max(200).optional(),
    ticketNumber: z.string().max(50).regex(PLATE_RE, "Ticket invalido").optional(),
    plate: z.string().min(3).max(20).regex(PLATE_RE, "Placa invalida").optional(),
    operatorUserId: z.string().uuid(),
    paymentMethod: paymentMethodSchema.optional(),
    agreementCode: z.string().max(50).optional().nullable(),
    observations: z.string().max(500).optional().nullable(),
    vehicleCondition: z.string().max(200).nullable().optional(),
    conditionChecklist: z.array(z.string().max(100)).optional(),
    conditionPhotoUrls: z.array(z.string().max(500)).optional()
  })
  .refine((v) => Boolean(v.ticketNumber?.trim() || v.plate?.trim()), {
    message: "ticketNumber o plate es obligatorio",
    path: ["ticketNumber"]
  });

export const operationReprintRequestSchema = z.object({
  idempotencyKey: z.string().max(200).optional(),
  ticketNumber: z.string().min(1),
  operatorUserId: z.string().uuid(),
  reason: z.string().min(1)
});

export const operationLostTicketRequestSchema = z
  .object({
    idempotencyKey: z.string().max(200).optional(),
    ticketNumber: z.string().optional(),
    plate: z.string().min(3).max(20).regex(PLATE_RE, "Placa invalida").optional(),
    operatorUserId: z.string().uuid(),
    paymentMethod: paymentMethodSchema.optional(),
    reason: z.string().min(1)
  })
  .refine((v) => Boolean(v.ticketNumber?.trim() || v.plate?.trim()), {
    message: "ticketNumber o plate es obligatorio",
    path: ["ticketNumber"]
  });

export const cashOpenRequestSchema = z.object({
  site: z.string().min(1).max(80),
  terminal: z.string().min(1).max(80),
  registerLabel: z.string().max(120).nullable().optional(),
  openingAmount: z.number().min(0),
  operatorUserId: z.string().uuid(),
  openIdempotencyKey: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional()
});

export const cashMovementRequestSchema = z.object({
  type: z.string().min(1),
  paymentMethod: z.string().min(1),
  amount: z.number().min(0.01),
  parkingSessionId: z.string().uuid().nullable().optional(),
  reason: z.string().max(2000).nullable().optional(),
  metadataJson: z.string().max(4000).nullable().optional(),
  externalReference: z.string().max(120).nullable().optional(),
  idempotencyKey: z.string().max(120).nullable().optional()
});

export const cashVoidMovementRequestSchema = z.object({
  reason: z.string().min(1).max(2000),
  idempotencyKey: z.string().max(120).optional()
});

export const cashCountRequestSchema = z.object({
  countCash: z.number().min(0),
  countCard: z.number().min(0),
  countTransfer: z.number().min(0),
  countOther: z.number().min(0),
  observations: z.string().max(4000).nullable().optional()
});

export const cashCloseRequestSchema = z.object({
  closingNotes: z.string().max(4000).nullable().optional(),
  closingWitnessName: z.string().max(200).nullable().optional(),
  closeIdempotencyKey: z.string().max(120).nullable().optional()
});

export const createPrintJobRequestSchema = z.object({
  sessionId: z.string().uuid(),
  operatorUserId: z.string().uuid(),
  documentType: z.custom<PrintDocumentType>((value) => {
    return (
      value === "ENTRY" ||
      value === "EXIT" ||
      value === "REPRINT" ||
      value === "LOST_TICKET" ||
      value === "CASH_CLOSING" ||
      value === "CASH_MOVEMENT" ||
      value === "CASH_COUNT"
    );
  }, "Tipo de documento invalido"),
  idempotencyKey: z.string().min(1),
  payloadHash: z.string().min(1)
});

export const authLoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceId: z.string().min(1),
  deviceName: z.string().min(1),
  platform: z.string().min(1),
  fingerprint: z.string().min(1),
  offlineRequestedHours: z.number().int().min(0).nullable().optional()
});

export const authRefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
  deviceId: z.string().min(1)
});

export const licensingHeartbeatRequestSchema = z.object({
  companyId: z.string().uuid(),
  deviceFingerprint: z.string().min(1),
  appVersion: z.string().min(1),
  currentLicenseKey: z.string().optional(),
  lastSyncAt: z.string().optional(),
  pendingSyncCount: z.number().int().min(0).optional(),
  syncedCount: z.number().int().min(0).optional(),
  failedSyncCount: z.number().int().min(0).optional(),
  printerHealthJson: z.string().optional(),
  errorReport: z.string().optional(),
  commandAcknowledged: z.boolean().optional(),
  acknowledgedCommand: z.string().optional()
});

export const licensingValidateRequestSchema = z.object({
  companyId: z.string().uuid(),
  deviceFingerprint: z.string().min(1),
  licenseKey: z.string().min(1),
  signature: z.string().min(1),
  hostname: z.string().optional(),
  operatingSystem: z.string().optional(),
  cpuInfo: z.string().optional(),
  macAddress: z.string().optional(),
  appVersion: z.string().optional()
});

export const licensingCreateCompanyRequestSchema = z.object({
  name: z.string().min(1),
  plan: z.enum(["LOCAL", "SYNC", "PRO", "ENTERPRISE"]),
  nit: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  contactName: z.string().optional(),
  maxDevices: z.number().int().min(1).optional(),
  maxLocations: z.number().int().min(1).optional(),
  maxUsers: z.number().int().min(1).optional(),
  trialDays: z.number().int().min(0).optional(),
  offlineModeAllowed: z.boolean().optional()
});

export const licensingUpdateCompanyRequestSchema = z.object({
  name: z.string().min(1).optional(),
  nit: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  contactName: z.string().optional(),
  plan: z.enum(["LOCAL", "SYNC", "PRO", "ENTERPRISE"]).optional(),
  status: z.enum(["ACTIVE", "PAST_DUE", "SUSPENDED", "BLOCKED", "EXPIRED", "TRIAL", "CANCELLED"]).optional(),
  maxDevices: z.number().int().min(1).optional(),
  maxLocations: z.number().int().min(1).optional(),
  maxUsers: z.number().int().min(1).optional(),
  offlineModeAllowed: z.boolean().optional(),
  offlineLeaseHours: z.number().int().min(1).optional(),
  customerMessage: z.string().optional(),
  adminNotes: z.string().optional()
});

export const licensingGenerateLicenseRequestSchema = z.object({
  companyId: z.string().uuid(),
  deviceFingerprint: z.string().min(1),
  hostname: z.string().optional(),
  operatingSystem: z.string().optional(),
  cpuInfo: z.string().optional(),
  macAddress: z.string().optional(),
  expiresAt: z.string().optional(),
  notes: z.string().optional()
});

export const licensingRemoteCommandRequestSchema = z.object({
  deviceId: z.string().uuid(),
  command: z.enum([
    "BLOCK_SYSTEM",
    "DISABLE_SYNC",
    "DISABLE_MODULE",
    "SHOW_ADMIN_MESSAGE",
    "FORCE_UPDATE",
    "REQUEST_RENEWAL",
    "PAYMENT_REMINDER",
    "CLEAR_LICENSE_CACHE",
    "REVOKE_LICENSE"
  ]),
  payload: z.string().optional(),
  reason: z.string().optional()
});

export const settingsRateStatusSchema = z.object({ active: z.boolean() });
export const settingsUserStatusSchema = z.object({ active: z.boolean() });
export const settingsPasswordResetSchema = z.object({ newPassword: z.string().min(8).max(120) });

export const settingsRateUpsertSchema = z.object({
  name: z.string().min(1).max(120),
  vehicleType: z.string().optional().nullable(),
  rateType: z.enum(["HOURLY", "FRACTION", "DAILY", "FLAT"]),
  amount: z.number().min(0),
  graceMinutes: z.number().int().min(0),
  toleranceMinutes: z.number().int().min(0),
  fractionMinutes: z.number().int().min(1),
  roundingMode: z.enum(["UP", "DOWN", "NEAREST"]),
  lostTicketSurcharge: z.number().min(0),
  active: z.boolean(),
  site: z.string().min(1).max(80),
  siteId: z.string().uuid().optional().nullable(),
  baseValue: z.number().min(0).optional().nullable(),
  baseMinutes: z.number().int().min(0).optional(),
  additionalValue: z.number().min(0).optional().nullable(),
  additionalMinutes: z.number().int().min(0).optional(),
  maxDailyValue: z.number().min(0).optional().nullable(),
  appliesNight: z.boolean().optional(),
  appliesHoliday: z.boolean().optional(),
  windowStart: z.string().optional().nullable(),
  windowEnd: z.string().optional().nullable(),
  scheduledActiveFrom: z.string().optional().nullable(),
  scheduledActiveTo: z.string().optional().nullable()
});

export const settingsUserCreateSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(180),
  document: z.string().max(32).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "SUPERVISOR", "CAJERO", "OPERADOR"]),
  site: z.string().max(80).optional().nullable(),
  terminal: z.string().max(80).optional().nullable(),
  canVoidTickets: z.boolean().optional(),
  canReprintTickets: z.boolean().optional(),
  canCloseCash: z.boolean().optional(),
  requirePasswordChange: z.boolean().optional(),
  initialPassword: z.string().min(8).max(120)
});

export const settingsUserPatchSchema = z.object({
  name: z.string().max(120).optional(),
  email: z.string().email().max(180).optional(),
  document: z.string().max(32).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "SUPERVISOR", "CAJERO", "OPERADOR"]).optional(),
  site: z.string().max(80).optional().nullable(),
  terminal: z.string().max(80).optional().nullable(),
  canVoidTickets: z.boolean().optional(),
  canReprintTickets: z.boolean().optional(),
  canCloseCash: z.boolean().optional(),
  requirePasswordChange: z.boolean().optional()
});

export const settingsParametersSchema = z.object({
  parkingName: z.string().optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  siteLabel: z.string().optional(),
  currency: z.string().optional(),
  timeZone: z.string().optional(),
  logoUrl: z.string().max(500).optional(),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  taxName: z.string().max(40).optional(),
  taxRatePercent: z.number().min(0).max(100).optional(),
  pricesIncludeTax: z.boolean().optional(),
  graceMinutesDefault: z.number().int().min(0).optional(),
  lostTicketPolicy: z.string().optional(),
  allowReprint: z.boolean().optional(),
  maxReprints: z.number().int().min(0).optional(),
  ticketPrefix: z.string().optional(),
  ticketFormat: z.string().optional(),
  defaultPaperWidthMm: z.number().int().optional(),
  defaultPrinterName: z.string().optional(),
  offlineModeEnabled: z.boolean().optional(),
  syncIntervalSeconds: z.number().int().min(0).optional(),
  printTimeoutSeconds: z.number().int().min(0).optional(),
  ticketHeaderMessage: z.string().max(500).optional(),
  ticketLegalMessage: z.string().max(1000).optional(),
  ticketFooterMessage: z.string().max(500).optional(),
  operationRulesMessage: z.string().max(1200).optional(),
  qrConfig: z.string().optional(),
  manualExitAllowed: z.boolean().optional(),
  allowOfflineEntryExit: z.boolean().optional(),
  cashRequireOpenForPayment: z.boolean().optional(),
  cashOfflineCloseAllowed: z.boolean().optional(),
  cashOfflineMaxManualMovement: z.number().min(0).optional(),
  businessLegalName: z.string().max(200).optional(),
  taxIdCheckDigit: z.string().max(2).optional(),
  dianInvoicePrefix: z.string().max(20).optional(),
  dianResolutionNumber: z.string().max(40).optional(),
  dianResolutionDate: z.string().max(10).optional(),
  dianRangeFrom: z.string().max(30).optional(),
  dianRangeTo: z.string().max(30).optional(),
  dianTechnicalKey: z.string().max(500).optional(),
  cashFeSequentialEnabled: z.boolean().optional(),
  cashFeSequencePerTerminal: z.boolean().optional(),
  cashFeSequenceDigits: z.number().int().min(6).max(13).optional(),
  cashFeOutboundWebhookUrl: z.string().max(500).optional(),
  cashFeOutboundWebhookBearer: z.string().max(2000).optional()
});

export const settingsLegacySiteSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
  address: z.string().max(300).optional(),
  phone: z.string().max(50).optional(),
  timeZone: z.string().max(50).optional(),
  maxCapacity: z.number().int().min(0).optional()
});
