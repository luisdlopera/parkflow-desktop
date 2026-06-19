import { buildApiHeaders } from "@/lib/api";
import { opsBase } from "@/lib/api/config";

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
  const res = await fetch(`${opsBase().replace(/\/$/, "")}/bulk-exits/calculate`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(request)
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.userMessage ?? payload?.error ?? "Error al pre-liquidar las salidas masivas");
  }
  return res.json();
}

export async function processBulkExit(request: BulkExitRequestDto): Promise<BulkExitResponseDto> {
  const res = await fetch(`${opsBase().replace(/\/$/, "")}/bulk-exits`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(request)
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.userMessage ?? payload?.error ?? "Error al procesar las salidas masivas");
  }
  return res.json();
}
