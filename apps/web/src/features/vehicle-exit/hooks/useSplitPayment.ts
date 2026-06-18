"use client";
import { useState, useCallback } from "react";
import { PAYMENT_METHOD_CATALOG, type PaymentMethodCode } from "@/lib/payment-method-catalog";

type SplitMethod = Exclude<PaymentMethodCode, "MIXED">;

export interface SplitPaymentRow {
  id: string;
  method: SplitMethod;
  amount: string;
}

const SPLIT_METHODS = PAYMENT_METHOD_CATALOG.filter(
  (m) => m.code !== "MIXED",
) as Array<{ code: SplitMethod; label: string; hint: string; tone: string }>;

export { SPLIT_METHODS };

export function useSplitPayment(
  totalDue: number,
  firstMethod: SplitMethod = "CASH",
  secondMethod: SplitMethod = "NEQUI",
) {
  const [splitPayments, setSplitPayments] = useState<SplitPaymentRow[]>([
    { id: "split-1", method: firstMethod, amount: "" },
    { id: "split-2", method: secondMethod, amount: "" },
  ]);

  const splitTotal = splitPayments.reduce(
    (sum, row) => sum + (Number(row.amount) || 0),
    0,
  );
  const splitRemaining = Math.max(0, totalDue - splitTotal);
  const splitCashReceived = splitPayments
    .filter((row) => row.method === "CASH")
    .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  const updateRow = useCallback((id: string, patch: Partial<SplitPaymentRow>) => {
    setSplitPayments((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }, []);

  const addRow = useCallback(() => {
    setSplitPayments((rows) => [
      ...rows,
      {
        id: `split-${Date.now()}`,
        method: SPLIT_METHODS[0].code,
        amount: "",
      },
    ]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setSplitPayments((rows) => rows.filter((row) => row.id !== id));
  }, []);

  const reset = useCallback(
    (first: SplitMethod = firstMethod, second: SplitMethod = secondMethod) => {
      setSplitPayments([
        { id: "split-1", method: first, amount: "" },
        { id: "split-2", method: second, amount: "" },
      ]);
    },
    [firstMethod, secondMethod],
  );

  function validate(): string | null {
    const validSplits = splitPayments.filter((row) => (Number(row.amount) || 0) > 0);
    if (validSplits.length < 2) {
      return "Para pago dividido registra al menos dos medios con valor.";
    }
    if (Math.abs(splitTotal - totalDue) > 0.009) {
      return `El pago dividido debe sumar $${totalDue.toLocaleString("es-CO")}. Falta $${Math.max(0, totalDue - splitTotal).toLocaleString("es-CO")}.`;
    }
    return null;
  }

  return {
    splitPayments,
    splitTotal,
    splitRemaining,
    splitCashReceived,
    updateRow,
    addRow,
    removeRow,
    reset,
    validate,
    SPLIT_METHODS,
  };
}
