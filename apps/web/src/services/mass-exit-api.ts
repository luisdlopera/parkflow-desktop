import { buildApiHeaders } from "@/lib/api";
import { opsBase } from "@/lib/api/config";

export type ChargeMode = "NORMAL" | "FREE" | "CUSTOM";

export type MassExitFilterRequestDto = {
  chargeMode: ChargeMode;
  customAmount?: number;
  reason: string;
  vehicleTypeCode?: string;
  siteCode?: string;
  entryFrom?: string;
  entryTo?: string;
  selectedLocators?: string[];
  operatorUserId: string;
  cashSessionId?: string;
  paymentMethod?: string;
};

export type MassExitItemStatus = "SUCCESS" | "FAILED" | "SKIPPED";

export type MassExitItemResultDto = {
  ticketNumber: string;
  plate: string;
  vehicleType: string | null;
  site: string | null;
  entryAt: string;
  status: MassExitItemStatus;
  amountCharged: number;
  errorMessage: string | null;
};

export type MassExitPreviewResponseDto = {
  totalCandidates: number;
  estimatedTotal: number;
  items: MassExitItemResultDto[];
  warnings: string[];
};

export type MassExitResponseDto = {
  totalCandidates: number;
  successCount: number;
  failCount: number;
  skippedCount: number;
  totalCharged: number;
  totalExempted: number;
  durationMs: number;
  batchId: string;
  items: MassExitItemResultDto[];
};

async function parseError(res: Response): Promise<string> {
  const payload = await res.json().catch(() => ({}));
  return payload?.userMessage ?? payload?.error ?? `Error ${res.status}`;
}

export async function previewMassExit(
  request: MassExitFilterRequestDto,
): Promise<MassExitPreviewResponseDto> {
  const res = await fetch(`${opsBase()}/mass-exit/calculate`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function processMassExit(
  request: MassExitFilterRequestDto,
): Promise<MassExitResponseDto> {
  const res = await fetch(`${opsBase()}/mass-exit`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
