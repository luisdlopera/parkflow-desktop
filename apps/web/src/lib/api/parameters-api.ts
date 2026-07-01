import { apiFetch, apiV1Base, buildApiHeaders, hdr } from "./_shared";
import { settingsParametersSchema } from "@/lib/validation/contracts";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";
import { apiEndpoints } from "./endpoints";

export type ParkingParametersPayload = {
  parkingName?: string;
  taxId?: string;
  address?: string;
  currency?: string;
  timeZone?: string;
  logoUrl?: string;
  brandColor?: string;
  taxName?: string;
  taxRatePercent?: number;
  pricesIncludeTax?: boolean;
  graceMinutesDefault?: number;
  lostTicketPolicy?: string;
  allowReprint?: boolean;
  maxReprints?: number;
  ticketPrefix?: string;
  ticketFormat?: string;
  defaultPaperWidthMm?: number;
  defaultPrinterName?: string;
  offlineModeEnabled?: boolean;
  syncIntervalSeconds?: number;
  printTimeoutSeconds?: number;
  ticketHeaderMessage?: string;
  ticketLegalMessage?: string;
  ticketFooterMessage?: string;
  operationRulesMessage?: string;
  qrConfig?: string;
  manualExitAllowed?: boolean;
  allowOfflineEntryExit?: boolean;
  printExitTicket?: boolean;
  cashRequireOpenForPayment: boolean | null;
  cashOfflineCloseAllowed: boolean | null;
  cashOfflineMaxManualMovement: number | null;
  cashMaxManualAdjustment: number | null;
  cashMaxSessionHours: number | null;
  cashAllowMultipleOpenSessions: boolean | null;
  cashAllowMultipleSessionsPerUser: boolean | null;
  cashFeOutboundWebhookUrl: string | null;
  businessLegalName?: string;
  taxIdCheckDigit?: string;
  dianInvoicePrefix?: string;
  dianResolutionNumber?: string;
  dianResolutionDate?: string;
  dianRangeFrom?: string;
  dianRangeTo?: string;
  dianTechnicalKey?: string;
  cashFeSequentialEnabled?: boolean;
  cashFeSequencePerTerminal?: boolean;
  cashFeSequenceDigits?: number;
  cashFeOutboundWebhookBearer?: string;
};

export type ParametersValidateResult = { ok: boolean; errors: string[] };

export async function fetchParameters(site?: string): Promise<ParkingParametersPayload> {
  const u = new URL(`${apiV1Base()}${apiEndpoints.configuration.parameters}`);
  if (site) u.searchParams.set("site", site);
  return apiFetch<ParkingParametersPayload>(u.toString(), {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}

export async function validateParameters(
  body: ParkingParametersPayload,
): Promise<ParametersValidateResult> {
  const validatedBody = validatePayloadOrThrow(settingsParametersSchema, body);
  return apiFetch<ParametersValidateResult>(
    `${apiV1Base()}${apiEndpoints.configuration.parametersValidate}`,
    {
      method: "POST",
      headers: await buildApiHeaders(),
      body: JSON.stringify(validatedBody),
    },
  );
}

export async function putParameters(
  body: ParkingParametersPayload,
  site?: string,
  auditReason?: string,
): Promise<ParkingParametersPayload> {
  const validatedBody = validatePayloadOrThrow(settingsParametersSchema, body);
  const u = new URL(`${apiV1Base()}${apiEndpoints.configuration.parameters}`);
  if (site) u.searchParams.set("site", site);
  return apiFetch<ParkingParametersPayload>(u.toString(), {
    method: "PUT",
    headers: await buildApiHeaders(hdr(auditReason)),
    body: JSON.stringify(validatedBody),
  });
}

export async function resetParameters(
  site?: string,
  auditReason?: string,
): Promise<ParkingParametersPayload> {
  const u = new URL(`${apiV1Base()}${apiEndpoints.configuration.parametersReset}`);
  if (site) u.searchParams.set("site", site);
  return apiFetch<ParkingParametersPayload>(u.toString(), {
    method: "POST",
    headers: await buildApiHeaders(hdr(auditReason)),
  });
}
