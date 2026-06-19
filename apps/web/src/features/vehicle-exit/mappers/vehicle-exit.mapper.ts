import type { PaymentMethodCode } from "@/lib/payment-method-catalog";
import type { SplitPaymentRow } from "../hooks/useSplitPayment";

export function buildExitBody(params: {
  userId: string;
  ticketNumber: string;
  paymentMethod: PaymentMethodCode;
  cashSessionId: string | null;
  observations: string | null;
  vehicleCondition: string;
  conditionChecklist: string;
  conditionPhotoUrls: string;
  agreementCode: string;
  pendingCustodiedItems: unknown[];
  returnConfirmedIds: string[];
  idempotencyKey: string;
  splitPayments?: SplitPaymentRow[];
}): Record<string, unknown> {
  return {
    idempotencyKey: params.idempotencyKey,
    ticketNumber: params.ticketNumber,
    operatorUserId: params.userId,
    paymentMethod: params.paymentMethod,
    cashSessionId: params.cashSessionId,
    observations: params.observations,
    vehicleCondition: params.vehicleCondition,
    conditionChecklist: params.conditionChecklist
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean),
    conditionPhotoUrls: params.conditionPhotoUrls
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean),
    agreementCode: params.agreementCode.trim() || null,
    returnedItemIds:
      params.pendingCustodiedItems.length > 0 ? params.returnConfirmedIds : undefined,
    custodiedItemObservations:
      params.pendingCustodiedItems.length > 0 ? "Devuelto en salida" : null,
    paymentBreakdown:
      params.paymentMethod === "MIXED"
        ? params.splitPayments
            ?.filter((r) => Number(r.amount) > 0)
            .map((r) => ({ method: r.method, amount: Number(r.amount) }))
        : undefined,
  };
}
