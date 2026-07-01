import type { VehicleType } from "@parkflow/types";
import type { ActiveLookup } from "../types";
import type { OperationPayload } from "@/lib/tauri-print";

import { ApiError } from "@/lib/errors/ApiError";
import { ErrorCode } from "@/lib/errors/error-codes";

export function operationPrintPayload(payload: { sessionId: string; receipt: ActiveLookup["receipt"] }): OperationPayload {
  return {
    sessionId: payload.sessionId,
    receipt: {
      ticketNumber: payload.receipt.ticketNumber,
      plate: payload.receipt.plate,
      vehicleType: payload.receipt.vehicleType as VehicleType,
      site: payload.receipt.site ?? null,
      lane: payload.receipt.lane ?? null,
      booth: payload.receipt.booth ?? null,
      terminal: payload.receipt.terminal ?? null,
      entryAt: payload.receipt.entryAt ?? null,
    },
  };
}

export function isNetworkError(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as any).code;
    if (code === ErrorCode.NETWORK_ERROR || code === "NETWORK_ERROR") {
      return true;
    }
  }
  if (err instanceof ApiError) {
    return err.code === ErrorCode.NETWORK_ERROR;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("fetch") ||
      msg.includes("networkerror") ||
      msg.includes("network error") ||
      msg.includes("load failed")
    );
  }
  return false;
}
