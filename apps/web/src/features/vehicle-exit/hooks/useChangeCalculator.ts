"use client";
import { useMemo } from "react";
import type { PaymentMethodCode } from "@/lib/payment-method-catalog";

export function useChangeCalculator(
  paymentMethod: PaymentMethodCode,
  cashReceived: string,
  splitCashReceived: number,
  totalDue: number,
) {
  const singleCashReceived = paymentMethod === "CASH" ? Number(cashReceived) || 0 : 0;
  const receivedForChange =
    paymentMethod === "CASH" ? singleCashReceived : splitCashReceived;

  const changeDue = useMemo(
    () => Math.max(0, receivedForChange - totalDue),
    [receivedForChange, totalDue],
  );

  const isInsufficient =
    paymentMethod === "CASH" &&
    singleCashReceived > 0 &&
    singleCashReceived < totalDue;

  const insufficientMessage = isInsufficient
    ? `El efectivo recibido es menor al total. Falta $${(totalDue - singleCashReceived).toLocaleString("es-CO")}.`
    : null;

  return {
    changeDue,
    singleCashReceived,
    receivedForChange,
    isInsufficient,
    insufficientMessage,
  };
}
