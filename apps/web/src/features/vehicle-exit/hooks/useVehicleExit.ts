"use client";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  lookupActiveSession,
  processExit as serviceProcessExit,
  reprintExitTicket,
  reportLostTicket,
  buildExitBody,
} from "../services/vehicle-exit.service";
import { useSplitPayment } from "./useSplitPayment";
import { useChangeCalculator } from "./useChangeCalculator";
import { queueOfflineOperation } from "@/lib/offline-outbox";
import { cashCurrent, cashPolicy } from "@/lib/cash/cash-api";
import { getOrCreateIdempotencyKey, clearIdempotencyKey } from "@/lib/idempotency";
import { buildTicketPreviewForOperation, printReceiptIfTauri, type OperationPayload } from "@/lib/tauri-print";
import { downloadTicketAsHtml } from "@/lib/print/ticket-download";
import { currentUser } from "@/lib/auth";
import { useRuntimeConfig } from "@/lib/useRuntimeConfig";
import { useTerminalCaja } from "@/hooks/useTerminalCaja";
import { useOperationSounds } from "@/lib/hooks/useOperationSounds";
import { PAYMENT_METHOD_CATALOG, type PaymentMethodCode } from "@/lib/payment-method-catalog";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
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

export function useVehicleExit() {
  const searchParams = useSearchParams();
  const initialTicketNumber = searchParams?.get("ticketNumber")?.trim() ?? "";
  const initialPlate = searchParams?.get("plate")?.trim().toUpperCase() ?? "";

  const { caja, requireOpenForPayment } = useTerminalCaja();
  const { config, isLoading: configLoading, hasPaymentMethod } = useRuntimeConfig();
  const { playSuccess, playError } = useOperationSounds();

  const [ticketNumber, setTicketNumber] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicleCondition, setVehicleCondition] = useState("Sin novedades a la salida");
  const [conditionChecklist, setConditionChecklist] = useState("");
  const [conditionPhotoUrls, setConditionPhotoUrls] = useState("");
  const [lostReason, setLostReason] = useState("Ticket perdido");
  const [agreementCode, setAgreementCode] = useState("");
  const [reprintReason, setReprintReason] = useState("Reimpresion solicitada por cliente");
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [active, setActive] = useState<ActiveLookup | null>(null);
  const [previewLines, setPreviewLines] = useState<string[] | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodCode>("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [pendingCustodiedItems, setPendingCustodiedItems] = useState<CustodiedItemInfo[]>([]);
  const [returnConfirmedIds, setReturnConfirmedIds] = useState<string[]>([]);
  const [printWarning, setPrintWarning] = useState<{ ticketNumber: string; plate: string; previewLines: string[] } | null>(null);
  const [reprintLoading, setReprintLoading] = useState(false);

  const operationLock = useRef(false);
  const reprintLock = useRef(false);
  const ticketInputRef = useRef<HTMLInputElement>(null);
  const autoLookupDone = useRef(false);

  const totalDue = Number(active?.total ?? active?.receipt.totalAmount ?? 0);
  const isSplitPayment = selectedPaymentMethod === "MIXED";

  const availablePaymentMethods = useMemo(() => {
    if (configLoading || config == null) return [];
    if (!config.paymentMethods || config.paymentMethods.length === 0) return [];
    return PAYMENT_METHOD_CATALOG.filter((m) => config.paymentMethods!.includes(m.code));
  }, [config, configLoading]);

  const isPaymentConfigMissing = !configLoading && config != null && availablePaymentMethods.length === 0;
  const firstMethod = availablePaymentMethods[0]?.code ?? ("CASH" as PaymentMethodCode);
  const secondMethod = availablePaymentMethods[1]?.code ?? firstMethod;
  const enableVehicleCondition = config?.operationConfiguration?.enableVehicleCondition ?? true;
  const enableCustodiedItem = config?.operationConfiguration?.enableCustodiedItem ?? true;

  const splitPaymentHook = useSplitPayment(totalDue, firstMethod as Exclude<PaymentMethodCode, "MIXED">, secondMethod as Exclude<PaymentMethodCode, "MIXED">);
  const { splitPayments, splitTotal, splitRemaining, splitCashReceived } = splitPaymentHook;

  const changeCalculator = useChangeCalculator(selectedPaymentMethod, cashReceived, splitCashReceived, totalDue);
  const { changeDue, singleCashReceived } = changeCalculator;

  function resetForm() {
    setActive(null);
    setTicketNumber("");
    setPlate("");
    setAgreementCode("");
    setPrintWarning(null);
    setTimeout(() => ticketInputRef.current?.focus(), 100);
  }

  // Auto-focus on mount
  useEffect(() => {
    setTimeout(() => ticketInputRef.current?.focus(), 100);
  }, []);

  // Sync initial URL params
  useEffect(() => {
    if (initialTicketNumber) setTicketNumber(initialTicketNumber);
    if (initialPlate) setPlate(initialPlate);
  }, [initialTicketNumber, initialPlate]);

  const lookup = useCallback(async (override?: { ticketNumber?: string; plate?: string }) => {
    setError("");
    setMessage("");
    setPrintWarning(null);
    const currentTicket = override?.ticketNumber ?? ticketNumber;
    const currentPlate = override?.plate ?? plate;
    const locator = currentTicket.trim() || currentPlate.trim();
    if (!locator) { setError("Ingresa ticket o placa"); return; }

    setSearching(true);
    setPreviewLines(null);
    try {
      const response = await lookupActiveSession(
        currentTicket.trim(),
        currentPlate.trim().toUpperCase(),
        agreementCode.trim() || undefined,
      );
      const payload = await response.json();
      if (!response.ok) {
        setActive(null);
        setError(payload?.userMessage ?? payload?.error ?? "No se encontro sesion activa");
        playError();
        return;
      }
      setActive(payload as ActiveLookup);
      setSelectedPaymentMethod(availablePaymentMethods[0]?.code ?? "CASH");
      setCashReceived("");
      const availableNonMixed = availablePaymentMethods.filter((m) => m.code !== "MIXED") as Array<{ code: Exclude<PaymentMethodCode, "MIXED">; label: string; hint: string; tone: string }>;
      splitPaymentHook.reset(availableNonMixed[0]?.code ?? "CASH", availableNonMixed[1]?.code ?? availableNonMixed[0]?.code ?? "CASH");
      if (payload.receipt.agreementCode) setAgreementCode(payload.receipt.agreementCode);
      const pending = ((payload.receipt.custodiedItems ?? []) as CustodiedItemInfo[]).filter((item) => item.status === "RECEIVED");
      setPendingCustodiedItems(pending);
      setReturnConfirmedIds(pending.map((item) => item.id));
      playSuccess();
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, FrontendActionError.LOAD_DATA));
      playError();
    } finally {
      setSearching(false);
    }
  }, [ticketNumber, plate, agreementCode, availablePaymentMethods, splitPaymentHook, playSuccess, playError]);

  // Auto-lookup from URL params
  useEffect(() => {
    if (autoLookupDone.current || (!initialTicketNumber && !initialPlate)) return;
    autoLookupDone.current = true;
    void lookup({ ticketNumber: initialTicketNumber, plate: initialPlate });
  }, [initialPlate, initialTicketNumber, lookup]);

  const processExitAction = useCallback(async (paymentMethod: PaymentMethodCode = selectedPaymentMethod) => {
    if (!active) { setError("Primero busca una sesion activa"); return; }
    if (operationLock.current) return;

    // Validate payment
    if (paymentMethod === "MIXED") {
      const validationError = splitPaymentHook.validate();
      if (validationError) { setError(validationError); return; }
    }
    if (paymentMethod === "CASH" && singleCashReceived > 0 && singleCashReceived < totalDue) {
      setError(`El efectivo recibido es menor al total. Falta $${(totalDue - singleCashReceived).toLocaleString("es-CO")}.`);
      return;
    }

    operationLock.current = true;
    setProcessing(true);
    setError("");
    setMessage("");
    setPrintWarning(null);

    try {
      const user = await currentUser();
      if (!user?.id) { setError("Sesion requerida para registrar salida"); return; }

      const term = process.env.NEXT_PUBLIC_TERMINAL_ID?.trim() || window.localStorage.getItem("parkflow_terminal_id")?.trim() || "";
      const site = process.env.NEXT_PUBLIC_PARKING_SITE?.trim() || "default";
      let cashSessionId: string | null = null;
      try {
        const cs = await cashCurrent(site, term || undefined);
        cashSessionId = cs.id;
      } catch {
        setError("Debe abrir caja en este terminal antes de procesar salidas");
        return;
      }

      const paymentObservation = (() => {
        if (paymentMethod === "MIXED") {
          const detail = splitPayments
            .filter((row) => (Number(row.amount) || 0) > 0)
            .map((row) => {
              const label = PAYMENT_METHOD_CATALOG.find((m) => m.code === row.method)?.label ?? row.method;
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
        setError(errMsg);
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
      if (validationMessage) { setError(validationMessage); toast.danger(validationMessage); playError(); return; }

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
        toast.success("Sin internet: salida guardada. Se sincronizará automáticamente al reconectar.");
        playSuccess();
        resetForm();
      } else {
        const errMsg = "Error de red procesando salida";
        setError(errMsg);
        toast.danger(errMsg);
        playError();
      }
    } finally {
      setProcessing(false);
      operationLock.current = false;
    }
  }, [active, selectedPaymentMethod, splitPaymentHook, splitPayments, splitTotal, singleCashReceived, changeDue, totalDue, vehicleCondition, conditionChecklist, conditionPhotoUrls, agreementCode, pendingCustodiedItems, returnConfirmedIds, playSuccess, playError]);

  const reprintTicket = useCallback(async () => {
    if (!active || reprintLock.current) return;
    reprintLock.current = true;
    setReprintLoading(true);
    setPreviewLines(null);
    setError("");
    setMessage("");
    const idempotencyFingerprint = JSON.stringify({ ticketNumber: active.receipt.ticketNumber, reason: reprintReason });
    try {
      const user = await currentUser();
      if (!user?.id) { setError("Sesion requerida para reimprimir"); return; }
      const idempotencyKey = getOrCreateIdempotencyKey("reprint", idempotencyFingerprint);
      const response = await reprintExitTicket(active.receipt.ticketNumber, user.id, idempotencyKey, reprintReason);
      const payload = await response.json();
      if (!response.ok) { setError(payload?.userMessage ?? payload?.error ?? "No se pudo reimprimir"); return; }
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
      if (validationMessage) { setError(validationMessage); playError(); return; }
      const queued = await queueOfflineOperation("TICKET_REPRINTED", { ticketNumber: active.receipt.ticketNumber, reason: reprintReason, occurredAtIso: new Date().toISOString(), origin: "OFFLINE_PENDING_SYNC" });
      if (queued) {
        clearIdempotencyKey("reprint", idempotencyFingerprint);
        toast.danger("Recibo guardado offline, pero no se pudo contactar a la impresora.");
        playSuccess();
      } else {
        setError(getUserFriendlyErrorMessage(err, FrontendActionError.PRINT_ACTION));
        playError();
      }
    } finally {
      setTimeout(() => { reprintLock.current = false; setReprintLoading(false); }, 500);
    }
  }, [active, reprintReason, playSuccess, playError]);

  const lostTicket = useCallback(async () => {
    if (!active || operationLock.current) return;
    operationLock.current = true;
    setProcessing(true);
    setError("");
    setMessage("");
    setPrintWarning(null);
    const idempotencyFingerprint = JSON.stringify({ ticketNumber: active.receipt.ticketNumber, reason: lostReason });
    try {
      const user = await currentUser();
      if (!user?.id) { setError("Sesion requerida para procesar ticket perdido"); playError(); return; }
      const idempotencyKey = getOrCreateIdempotencyKey("lost_ticket", idempotencyFingerprint);
      const response = await reportLostTicket(active.receipt.ticketNumber, active.receipt.plate, user.id, idempotencyKey, lostReason);
      const payload = await response.json();
      if (!response.ok) { setError(payload?.userMessage ?? payload?.error ?? "No se pudo procesar ticket perdido"); playError(); return; }
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
      if (validationMessage) { setError(validationMessage); playError(); return; }
      const queued = await queueOfflineOperation("LOST_TICKET", { ticketNumber: active.receipt.ticketNumber, reason: lostReason, occurredAtIso: new Date().toISOString(), origin: "OFFLINE_PENDING_SYNC" });
      if (queued) {
        clearIdempotencyKey("lost_ticket", idempotencyFingerprint);
        setMessage("Sin internet: operacion de ticket perdido en cola offline.");
        playSuccess();
      } else {
        setError(getUserFriendlyErrorMessage(err, FrontendActionError.SAVE_DATA));
        playError();
      }
    } finally {
      setProcessing(false);
      operationLock.current = false;
    }
  }, [active, lostReason, playSuccess, playError]);

  const handleDownloadPrintWarning = useCallback(() => {
    if (!printWarning) return;
    downloadTicketAsHtml(printWarning.previewLines, printWarning.ticketNumber, printWarning.plate);
  }, [printWarning]);

  const handleClosePrintWarning = useCallback(() => {
    setPrintWarning(null);
    resetForm();
  }, []);

  const toggleReturnItem = useCallback((id: string, checked: boolean) => {
    setReturnConfirmedIds((prev) => checked ? [...prev, id] : prev.filter((i) => i !== id));
  }, []);

  return {
    // State
    ticketNumber, setTicketNumber,
    plate, setPlate,
    vehicleCondition, setVehicleCondition,
    conditionChecklist, setConditionChecklist,
    conditionPhotoUrls, setConditionPhotoUrls,
    lostReason, setLostReason,
    agreementCode, setAgreementCode,
    reprintReason, setReprintReason,
    searching, processing, error, message,
    active,
    previewLines,
    selectedPaymentMethod, setSelectedPaymentMethod,
    cashReceived, setCashReceived,
    pendingCustodiedItems,
    returnConfirmedIds,
    printWarning,
    reprintLoading,
    // Derived
    totalDue, isSplitPayment, changeDue, singleCashReceived,
    availablePaymentMethods, isPaymentConfigMissing, firstMethod, secondMethod,
    enableVehicleCondition, enableCustodiedItem,
    splitPayments: splitPaymentHook.splitPayments,
    splitTotal: splitPaymentHook.splitTotal,
    splitRemaining: splitPaymentHook.splitRemaining,
    splitCashReceived: splitPaymentHook.splitCashReceived,
    updateSplitRow: splitPaymentHook.updateRow,
    addSplitRow: splitPaymentHook.addRow,
    removeSplitRow: splitPaymentHook.removeRow,
    // Caja state
    caja, requireOpenForPayment,
    // Refs
    ticketInputRef,
    // Actions
    lookup,
    processExitAction,
    reprintTicket,
    lostTicket,
    handleDownloadPrintWarning,
    handleClosePrintWarning,
    toggleReturnItem,
  };
}
