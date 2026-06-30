"use client";
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import useSWR from "swr";
import {
  processExit as serviceProcessExit,
  reprintExitTicket,
  reportLostTicket,
} from "../services/vehicle-exit.service";
import { buildExitBody } from "../mappers/vehicle-exit.mapper";
import { useSplitPayment } from "./useSplitPayment";
import { useChangeCalculator } from "./useChangeCalculator";
import { useExitLookup } from "./useExitLookup";
import { queueOfflineOperation } from "@/lib/offline-outbox";
import { cashCurrent, cashPolicy } from "@/lib/cash/cash-api";
import { getOrCreateIdempotencyKey, clearIdempotencyKey } from "@/lib/idempotency";
import { buildTicketPreviewForOperation, printReceiptIfTauri, type OperationPayload } from "@/lib/tauri-print";
import { downloadTicketAsHtml } from "@/lib/print/ticket-download";
import { currentUser } from "@/lib/services/auth-domain.service";
import { useRuntimeConfig } from "@/lib/useRuntimeConfig";
import { fetchConfigurationPaymentMethods } from "@/lib/api/payment-methods-api";
import { useTerminalCaja } from "@/features/cash-register/hooks/useTerminalCaja";
import { useOperationSounds } from "@/hooks/ui/useOperationSounds";
import { PAYMENT_METHOD_CATALOG, type PaymentMethodCode } from "@/lib/payment-method-catalog";
import { errorService } from "@/lib/errors/error-service";
import { toUserMessageFromClientValidation } from "@/lib/validation/request-guard";
import { toast } from "@heroui/react";
import type { VehicleType } from "@parkflow/types";

export type CustodiedItemInfo = {
  id: string;
  itemType: string;
  identifier?: string | null;
  status: string;
  observations?: string | null;
  receivedByName?: string | null;
  receivedAt?: string | null;
  returnedByName?: string | null;
  returnedAt?: string | null;
};

export type ActiveLookup = {
  sessionId: string;
  subtotal?: number | string | null;
  surcharge?: number | string | null;
  discount?: number | string | null;
  deductedMinutes?: number | null;
  total?: number | string | null;
  receipt: {
    ticketNumber: string;
    plate: string;
    vehicleType: string;
    site?: string | null;
    lane?: string | null;
    booth?: string | null;
    terminal?: string | null;
    entryAt?: string | null;
    duration: string;
    totalAmount: number | null;
    rateName: string | null;
    status: string;
    lostTicket: boolean;
    reprintCount: number;
    entryMode?: string | null;
    monthlySession?: boolean;
    agreementCode?: string | null;
    prepaidMinutes?: number | null;
    custodiedItems?: CustodiedItemInfo[];
  };
};

function operationPrintPayload(
  payload: { sessionId: string; receipt: ActiveLookup["receipt"] }
): OperationPayload {
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

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError && err.message.includes("fetch");
}

export function useVehicleExit() {
  const { caja, requireOpenForPayment } = useTerminalCaja();
  const { config, isLoading: configLoading, hasPaymentMethod } = useRuntimeConfig();
  const { playSuccess, playError } = useOperationSounds();

  const [vehicleCondition, setVehicleCondition] = useState("Sin novedades a la salida");
  const [conditionChecklist, setConditionChecklist] = useState("");
  const [conditionPhotoUrls, setConditionPhotoUrls] = useState("");
  const [lostReason, setLostReason] = useState("Ticket perdido");
  const [reprintReason, setReprintReason] = useState("Reimpresion solicitada por cliente");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [previewLines, setPreviewLines] = useState<string[] | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodCode>("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [printWarning, setPrintWarning] = useState<{ ticketNumber: string; plate: string; previewLines: string[] } | null>(null);
  const [reprintLoading, setReprintLoading] = useState(false);

  const operationLock = useRef(false);
  const reprintLock = useRef(false);

  const { data: dbMethodsData, isLoading: methodsLoading } = useSWR(
    "active-payment-methods",
    () => fetchConfigurationPaymentMethods({ active: true, size: 50 }),
    { revalidateOnFocus: false, revalidateOnMount: true }
  );

  const availablePaymentMethods = useMemo(() => {
    if (methodsLoading || !dbMethodsData) return [];
    return dbMethodsData.content
      .map((m) => {
        let tone = "bg-slate-700 hover:bg-slate-800 border border-default-200";
        if (m.code === "CASH") tone = "bg-emerald-500 hover:bg-emerald-600 border border-default-200";
        else if (m.code === "DEBIT_CARD") tone = "bg-sky-500 hover:bg-sky-600 border border-default-200";
        else if (m.code === "CREDIT_CARD") tone = "bg-indigo-500 hover:bg-indigo-600 border border-default-200";
        else if (m.code === "TRANSFER") tone = "bg-cyan-600 hover:bg-cyan-700 border border-default-200";
        else if (m.code === "NEQUI") tone = "bg-fuchsia-500 hover:bg-fuchsia-600 border border-default-200";
        else if (m.code === "DAVIPLATA") tone = "bg-rose-500 hover:bg-rose-600 border border-default-200";
        else if (m.code === "AGREEMENT") tone = "bg-amber-500 hover:bg-amber-600 border border-default-200";

        return {
          code: m.code as PaymentMethodCode,
          label: m.name,
          hint: m.requiresReference ? "Referencia requerida" : "",
          tone,
          requiresReference: m.requiresReference,
          availableInOnboarding: true,
        };
      });
  }, [dbMethodsData, methodsLoading, hasPaymentMethod]);

  const isPaymentConfigMissing = !methodsLoading && dbMethodsData && availablePaymentMethods.length === 0;
  const firstMethod = availablePaymentMethods[0]?.code ?? ("CASH" as PaymentMethodCode);
  const secondMethod = availablePaymentMethods[1]?.code ?? firstMethod;
  const enableVehicleCondition = config?.operationConfiguration?.enableVehicleCondition ?? true;
  const enableCustodiedItem = config?.operationConfiguration?.enableCustodiedItem ?? true;

  const splitPaymentHook = useSplitPayment(0, firstMethod as Exclude<PaymentMethodCode, "MIXED">, secondMethod as Exclude<PaymentMethodCode, "MIXED">);
  const { splitPayments, splitTotal, splitRemaining, splitCashReceived } = splitPaymentHook;

  const lookupHook = useExitLookup(availablePaymentMethods, splitPaymentHook.reset);
  const { active, setActive, agreementCode, pendingCustodiedItems, returnConfirmedIds, ticketInputRef, resetLookup } = lookupHook;

  const totalDue = Number(active?.total ?? active?.receipt.totalAmount ?? 0);
  const isSplitPayment = selectedPaymentMethod === "MIXED";

  const changeCalculator = useChangeCalculator(selectedPaymentMethod, cashReceived, splitCashReceived, totalDue);
  const { changeDue, singleCashReceived } = changeCalculator;

  // Reset payment state when a new session is found
  useEffect(() => {
    if (active) {
      setSelectedPaymentMethod(availablePaymentMethods[0]?.code ?? "CASH");
      setCashReceived("");
    }
  }, [active, availablePaymentMethods]);

  function resetForm() {
    setPrintWarning(null);
    resetLookup();
  }

  const processExitAction = useCallback(async (paymentMethod: PaymentMethodCode = selectedPaymentMethod) => {
    if (!active) { lookupHook.setError("Primero busca una sesión activa"); return; }
    if (operationLock.current) return;

    if (paymentMethod === "MIXED") {
      const validationError = splitPaymentHook.validate();
      if (validationError) { lookupHook.setError(validationError); return; }
    }
    if (paymentMethod === "CASH" && singleCashReceived > 0 && singleCashReceived < totalDue) {
      lookupHook.setError(`El efectivo recibido es menor al total. Falta $${(totalDue - singleCashReceived).toLocaleString("es-CO")}.`);
      return;
    }

    operationLock.current = true;
    setProcessing(true);
    lookupHook.setError("");
    setMessage("");
    setPrintWarning(null);

    try {
      const user = await currentUser();
      if (!user?.id) { lookupHook.setError("Sesión requerida para registrar salida"); return; }

      const term = process.env.NEXT_PUBLIC_TERMINAL_ID?.trim() || window.localStorage.getItem("parkflow_terminal_id")?.trim() || "";
      const site = process.env.NEXT_PUBLIC_PARKING_SITE?.trim() || "default";
      let cashSessionId: string | null = null;
      try {
        const cs = await cashCurrent(site, term || undefined);
        cashSessionId = cs.id;
      } catch {
        lookupHook.setError("Debe abrir caja en este terminal antes de procesar salidas");
        return;
      }

      const paymentObservation = (() => {
        if (paymentMethod === "MIXED") {
          const detail = splitPayments
            .filter((row) => (Number(row.amount) || 0) > 0)
            .map((row) => {
              const label = availablePaymentMethods.find((m) => m.code === row.method)?.label ?? row.method;
              return `${label} $${Number(row.amount).toLocaleString("es-CO")}`;
            })
            .join(" + ");
          return `Pago dividido: ${detail}. Total recibido $${splitTotal.toLocaleString("es-CO")}.`;
        }
        if (paymentMethod === "CASH" && singleCashReceived > 0) {
          return `Pago en efectivo: recibido $${singleCashReceived.toLocaleString("es-CO")}; vuelto $${changeDue.toLocaleString("es-CO")}.`;
        }
        return null;
      })();

      const idempotencyFingerprint = JSON.stringify({ ticketNumber: active.receipt.ticketNumber, paymentMethod, total: totalDue });
      const idempotencyKey = getOrCreateIdempotencyKey("exit", idempotencyFingerprint);

      const requestBody = buildExitBody({
        userId: user.id,
        ticketNumber: active.receipt.ticketNumber,
        paymentMethod,
        cashSessionId,
        observations: paymentObservation,
        vehicleCondition,
        conditionChecklist,
        conditionPhotoUrls,
        agreementCode,
        pendingCustodiedItems,
        returnConfirmedIds,
        idempotencyKey,
        splitPayments: splitPayments as Parameters<typeof buildExitBody>[0]["splitPayments"],
      });

      const response = await serviceProcessExit(requestBody);
      const payload = await response.json();
      if (!response.ok) {
        let errMsg = payload?.userMessage ?? (typeof payload.error === "string" ? payload.error : null) ?? "No se pudo registrar la salida";
        if (/caja/i.test(errMsg)) {
          try {
            const pol = await cashPolicy(active.receipt.site ?? null);
            errMsg = `${errMsg} ${pol.operationsHint}`.trim();
          } catch { /* keep base message */ }
        }
        lookupHook.setError(errMsg);
        toast.danger(errMsg);
        playError();
        return;
      }

      clearIdempotencyKey("exit", idempotencyFingerprint);
      const printPayload = operationPrintPayload(payload as ActiveLookup);
      const receiptPreview = buildTicketPreviewForOperation(printPayload, "EXIT");
      setPreviewLines(receiptPreview);

      let printWarningMsg: string | null = null;
      try { printWarningMsg = await printReceiptIfTauri(printPayload, "EXIT"); }
      catch (e) { printWarningMsg = e instanceof Error ? `No se pudo imprimir: ${e.message}` : "No se pudo imprimir."; }

      if (printWarningMsg) {
        setPrintWarning({ ticketNumber: (payload as ActiveLookup).receipt.ticketNumber, plate: (payload as ActiveLookup).receipt.plate, previewLines: receiptPreview });
      } else {
        playSuccess();
        toast.success(`Salida registrada. Total: $${Number((payload as ActiveLookup).total ?? 0).toLocaleString("es-CO")}`);
        resetForm();
      }
} catch (err) {
      const validationMessage = toUserMessageFromClientValidation(err);
      if (validationMessage) { lookupHook.setError(validationMessage); errorService.toast.error(validationMessage); playError(); return; }

      if (!isNetworkError(err)) {
        const errMsg = errorService.normalize(err).message;
        lookupHook.setError(errMsg);
        errorService.toast.error(err);
        playError();
        return;
      }

      const idempotencyFingerprint = JSON.stringify({ ticketNumber: active.receipt.ticketNumber, paymentMethod, total: totalDue });
      const queued = await queueOfflineOperation("EXIT_RECORDED", {
        ticketNumber: active.receipt.ticketNumber,
        paymentMethod,
        paymentBreakdown: paymentMethod === "MIXED" ? splitPayments : undefined,
        occurredAtIso: new Date().toISOString(),
        origin: "OFFLINE_PENDING_SYNC",
      });
      if (queued) {
        clearIdempotencyKey("exit", idempotencyFingerprint);
        toast.success("Sin internet: salida guardada. Se sincronizara automaticamente al reconectar.");
        playSuccess();
        resetForm();
      } else {
        const errMsg = "Error de red procesando salida";
        lookupHook.setError(errMsg);
        errorService.toast.error(errMsg);
        playError();
      }
    } finally {
      setProcessing(false);
      operationLock.current = false;
    }
  }, [active, selectedPaymentMethod, splitPaymentHook, splitPayments, splitTotal, singleCashReceived, changeDue, totalDue, vehicleCondition, conditionChecklist, conditionPhotoUrls, agreementCode, pendingCustodiedItems, returnConfirmedIds, playSuccess, playError, lookupHook]);

  const reprintTicket = useCallback(async () => {
    if (!active || reprintLock.current) return;
    reprintLock.current = true;
    setReprintLoading(true);
    setPreviewLines(null);
    lookupHook.setError("");
    setMessage("");
    const idempotencyFingerprint = JSON.stringify({ ticketNumber: active.receipt.ticketNumber, reason: reprintReason });
    try {
      const user = await currentUser();
      if (!user?.id) { lookupHook.setError("Sesión requerida para reimprimir"); return; }
      const idempotencyKey = getOrCreateIdempotencyKey("reprint", idempotencyFingerprint);
      const response = await reprintExitTicket(active.receipt.ticketNumber, user.id, idempotencyKey, reprintReason);
      const payload = await response.json();
      if (!response.ok) { lookupHook.setError(payload?.userMessage ?? payload?.error ?? "No se pudo reimprimir"); return; }
      clearIdempotencyKey("reprint", idempotencyFingerprint);
      const printPayload = operationPrintPayload(payload as ActiveLookup);
      setPreviewLines(buildTicketPreviewForOperation(printPayload, "REPRINT"));
      let printWarningMsg: string | null = null;
      try { printWarningMsg = await printReceiptIfTauri(printPayload, "REPRINT"); }
      catch (e) { printWarningMsg = e instanceof Error ? `No se pudo imprimir: ${e.message}` : "No se pudo imprimir."; }
      if (printWarningMsg) {
        setPrintWarning({ ticketNumber: (payload as ActiveLookup).receipt.ticketNumber, plate: (payload as ActiveLookup).receipt.plate, previewLines: buildTicketPreviewForOperation(printPayload, "REPRINT") });
      } else {
        playSuccess();
        setMessage(`Ticket reimpreso (${(payload as ActiveLookup).receipt.ticketNumber})`);
        setActive(payload as ActiveLookup);
      }
    } catch (err) {
      const validationMessage = toUserMessageFromClientValidation(err);
      if (validationMessage) { lookupHook.setError(validationMessage); playError(); return; }
      const queued = await queueOfflineOperation("TICKET_REPRINTED", { ticketNumber: active.receipt.ticketNumber, reason: reprintReason, occurredAtIso: new Date().toISOString(), origin: "OFFLINE_PENDING_SYNC" });
      if (queued) {
        clearIdempotencyKey("reprint", idempotencyFingerprint);
        errorService.toast.error("Recibo guardado offline, pero no se pudo contactar a la impresora.");
        playSuccess();
      } else {
        lookupHook.setError(errorService.normalize(err).message);
        playError();
      }
    } finally {
      setTimeout(() => { reprintLock.current = false; setReprintLoading(false); }, 500);
    }
  }, [active, reprintReason, playSuccess, playError, lookupHook, setActive]);

  const lostTicket = useCallback(async () => {
    if (!active || operationLock.current) return;
    operationLock.current = true;
    setProcessing(true);
    lookupHook.setError("");
    setMessage("");
    setPrintWarning(null);
    const idempotencyFingerprint = JSON.stringify({ ticketNumber: active.receipt.ticketNumber, reason: lostReason });
    try {
      const user = await currentUser();
      if (!user?.id) { lookupHook.setError("Sesión requerida para procesar ticket perdido"); playError(); return; }
      const idempotencyKey = getOrCreateIdempotencyKey("lost_ticket", idempotencyFingerprint);
      const response = await reportLostTicket(active.receipt.ticketNumber, active.receipt.plate, user.id, idempotencyKey, lostReason);
      const payload = await response.json();
      if (!response.ok) { lookupHook.setError(payload?.userMessage ?? payload?.error ?? "No se pudo procesar ticket perdido"); playError(); return; }
      clearIdempotencyKey("lost_ticket", idempotencyFingerprint);
      const printPayload = operationPrintPayload(payload as ActiveLookup);
      setPreviewLines(buildTicketPreviewForOperation(printPayload, "LOST_TICKET"));
      let printWarningMsg: string | null = null;
      try { printWarningMsg = await printReceiptIfTauri(printPayload, "LOST_TICKET"); }
      catch (e) { printWarningMsg = e instanceof Error ? `No se pudo imprimir: ${e.message}` : "No se pudo imprimir."; }
      if (printWarningMsg) {
        setPrintWarning({ ticketNumber: (payload as ActiveLookup).receipt.ticketNumber, plate: (payload as ActiveLookup).receipt.plate, previewLines: buildTicketPreviewForOperation(printPayload, "LOST_TICKET") });
      } else {
        playSuccess();
        setMessage(`Ticket perdido procesado. Total: $ ${Number((payload as ActiveLookup).total ?? 0).toLocaleString("es-CO")}`);
        setActive(null);
        setTimeout(() => ticketInputRef.current?.focus(), 100);
      }
    } catch (err) {
      const validationMessage = toUserMessageFromClientValidation(err);
      if (validationMessage) { lookupHook.setError(validationMessage); playError(); return; }
      const queued = await queueOfflineOperation("LOST_TICKET", { ticketNumber: active.receipt.ticketNumber, reason: lostReason, occurredAtIso: new Date().toISOString(), origin: "OFFLINE_PENDING_SYNC" });
      if (queued) {
        clearIdempotencyKey("lost_ticket", idempotencyFingerprint);
        setMessage("Sin internet: operacion de ticket perdido en cola offline.");
        playSuccess();
      } else {
        lookupHook.setError(errorService.normalize(err).message);
        playError();
      }
    } finally {
      setProcessing(false);
      operationLock.current = false;
    }
  }, [active, lostReason, playSuccess, playError, lookupHook, setActive, ticketInputRef]);

  const handleDownloadPrintWarning = useCallback(() => {
    if (!printWarning) return;
    downloadTicketAsHtml(printWarning.previewLines, printWarning.ticketNumber, printWarning.plate);
  }, [printWarning]);

  const handleClosePrintWarning = useCallback(() => {
    setPrintWarning(null);
    resetLookup();
  }, [resetLookup]);

  return {
    // From lookup hook
    ticketNumber: lookupHook.ticketNumber,
    setTicketNumber: lookupHook.setTicketNumber,
    plate: lookupHook.plate,
    setPlate: lookupHook.setPlate,
    agreementCode: lookupHook.agreementCode,
    setAgreementCode: lookupHook.setAgreementCode,
    searching: lookupHook.searching,
    active,
    pendingCustodiedItems: lookupHook.pendingCustodiedItems,
    returnConfirmedIds: lookupHook.returnConfirmedIds,
    error: lookupHook.error,
    ticketInputRef,
    lookup: lookupHook.lookup,
    toggleReturnItem: lookupHook.toggleReturnItem,
    // Local state
    vehicleCondition, setVehicleCondition,
    conditionChecklist, setConditionChecklist,
    conditionPhotoUrls, setConditionPhotoUrls,
    lostReason, setLostReason,
    reprintReason, setReprintReason,
    processing,
    message,
    previewLines,
    selectedPaymentMethod, setSelectedPaymentMethod,
    cashReceived, setCashReceived,
    printWarning,
    reprintLoading,
    // Derived
    totalDue, isSplitPayment, changeDue, singleCashReceived,
    availablePaymentMethods, isPaymentConfigMissing, firstMethod, secondMethod,
    enableVehicleCondition, enableCustodiedItem, allowTicketReprint: config?.tickets?.allowReprint ?? true,
    splitPayments: splitPaymentHook.splitPayments,
    splitTotal: splitPaymentHook.splitTotal,
    splitRemaining: splitPaymentHook.splitRemaining,
    splitCashReceived: splitPaymentHook.splitCashReceived,
    updateSplitRow: splitPaymentHook.updateRow,
    addSplitRow: splitPaymentHook.addRow,
    removeSplitRow: splitPaymentHook.removeRow,
    // Caja state
    caja, requireOpenForPayment,
    // Actions
    processExitAction,
    reprintTicket,
    lostTicket,
    handleDownloadPrintWarning,
    handleClosePrintWarning,
  };
}
