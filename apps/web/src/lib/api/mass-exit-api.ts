import { buildApiHeaders } from "@/lib/api";
import { opsBase } from "@/lib/api/config";
import { apiFetch } from "./_shared";

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

export async function previewMassExit(
  request: MassExitFilterRequestDto,
): Promise<MassExitPreviewResponseDto> {
  return apiFetch<MassExitPreviewResponseDto>(`${opsBase()}/mass-exit/calculate`, {
    method: "POST",
    headers: {
      ...(await buildApiHeaders()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
}

export async function processMassExit(
  request: MassExitFilterRequestDto,
): Promise<MassExitResponseDto> {
  return apiFetch<MassExitResponseDto>(`${opsBase()}/mass-exit`, {
    method: "POST",
    headers: {
      ...(await buildApiHeaders()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
}
