import { buildApiHeaders } from "@/lib/api";
import { opsBase } from "@/lib/api/config";
import { apiFetch } from "./_shared";

export type BulkExitRequestDto = {
  locators: string[];
  operatorUserId: string;
  paymentMethod?: string;
  agreementCode?: string;
  observations?: string;
  cashSessionId?: string;
};

export type VehicleCalculationItem = {
  locator: string;
  plate: string;
  ticketNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  errorMessage: string | null;
};

export type BulkExitCalculateResponseDto = {
  totalSubtotal: number;
  totalSurcharge: number;
  totalDiscount: number;
  finalTotal: number;
  totalVehicles: number;
  items: VehicleCalculationItem[];
  errors: string[];
};

export type BulkExitResponseDto = {
  totalCharged: number;
  successfulCount: number;
  failedCount: number;
  successfulReceipts: Record<string, unknown>[];
  errors: string[];
};

export async function precalculateBulkExit(request: BulkExitRequestDto): Promise<BulkExitCalculateResponseDto> {
  return apiFetch<BulkExitCalculateResponseDto>(`${opsBase().replace(/\/$/, "")}/bulk-exits/calculate`, {
    method: "POST",
    headers: {
      ...(await buildApiHeaders()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
}

export async function processBulkExit(request: BulkExitRequestDto): Promise<BulkExitResponseDto> {
  return apiFetch<BulkExitResponseDto>(`${opsBase().replace(/\/$/, "")}/bulk-exits`, {
    method: "POST",
    headers: {
      ...(await buildApiHeaders()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
}
