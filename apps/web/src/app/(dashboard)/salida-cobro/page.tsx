"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  Input,
  Button,
  Textarea,
  Select,
  SelectItem,
} from "@heroui/react";
import Badge from "@/components/ui/Badge";
import TicketReceiptPreview from "@/components/tickets/TicketReceiptPreview";
import { ChangeCalculator } from "@/components/ui/ChangeCalculator";
import { buildApiHeaders } from "@/lib/api";
import { newIdempotencyKey } from "@/lib/idempotency";
import { queueOfflineOperation } from "@/lib/offline-outbox";
import { cashPolicy } from "@/lib/cash/cash-api";
import {
  buildTicketPreviewForOperation,
  printReceiptIfTauri,
  resolvePaperWidthMm,
  type OperationPayload
} from "@/lib/tauri-print";
import type { VehicleType } from "@parkflow/types";
import { useExitShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useOperationSounds } from "@/lib/hooks/useOperationSounds";
import { useToast } from "@/lib/toast/ToastContext";
import { currentUser } from "@/lib/auth";
import {
  operationExitRequestSchema,
  operationLostTicketRequestSchema,
  operationReprintRequestSchema
} from "@/lib/validation/contracts";
import { toUserMessageFromClientValidation, validatePayloadOrThrow } from "@/lib/validation/request-guard";

type ActiveLookup = {
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
  };
};

type PaymentMethodCode =
  | "CASH"
  | "DEBIT_CARD"
  | "CREDIT_CARD"
  | "CARD"
  | "QR"
  | "NEQUI"
  | "DAVIPLATA"
  | "TRANSFER"
  | "AGREEMENT"
  | "INTERNAL_CREDIT"
  | "OTHER"
  | "MIXED";

type SplitPaymentRow = {
  id: string;
  method: Exclude<PaymentMethodCode, "MIXED">;
  amount: string;
};

const PAYMENT_METHODS: Array<{ code: PaymentMethodCode; label: string; hint: string; tone: string }> = [
  { code: "CASH", label: "Efectivo", hint: "Cambio / vuelto", tone: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30" },
  { code: "DEBIT_CARD", label: "Tarjeta débito", hint: "Datáfono débito", tone: "bg-sky-500 hover:bg-sky-600 shadow-sky-500/30" },
  { code: "CREDIT_CARD", label: "Tarjeta crédito", hint: "Datáfono crédito", tone: "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/30" },
  { code: "QR", label: "QR", hint: "Código QR", tone: "bg-slate-700 hover:bg-slate-800 shadow-slate-500/30" },
  { code: "NEQUI", label: "Nequi", hint: "Referencia requerida", tone: "bg-fuchsia-500 hover:bg-fuchsia-600 shadow-fuchsia-500/30" },
  { code: "DAVIPLATA", label: "Daviplata", hint: "Referencia requerida", tone: "bg-rose-500 hover:bg-rose-600 shadow-rose-500/30" },
  { code: "TRANSFER", label: "Transferencia", hint: "Banco / referencia", tone: "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-500/30" },
  { code: "AGREEMENT", label: "Convenio", hint: "Empresa aliada", tone: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30" },
  { code: "INTERNAL_CREDIT", label: "Crédito interno", hint: "Cartera interna", tone: "bg-violet-500 hover:bg-violet-600 shadow-violet-500/30" },
  { code: "OTHER", label: "Otro", hint: "Caso especial", tone: "bg-zinc-500 hover:bg-zinc-600 shadow-zinc-500/30" },
  { code: "MIXED", label: "Mixto", hint: "Pago dividido", tone: "bg-teal-600 hover:bg-teal-700 shadow-teal-500/30" },
];

const SPLIT_METHODS = PAYMENT_METHODS.filter((method) => method.code !== "MIXED") as Array<{
  code: Exclude<PaymentMethodCode, "MIXED">;
  label: string;
  hint: string;
  tone: string;
}>;

const ENTRY_MODE_LABEL: Record<string, string> = {
  VISITOR: "Visitante",
  AGREEMENT: "Convenio",
  SUBSCRIBER: "Abonado",
  EMPLOYEE: "Empleado / cortesía",
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
      entryAt: payload.receipt.entryAt ?? null
    }
  };
}

export default function SalidaCobroPage() {
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
  const [splitPayments, setSplitPayments] = useState<SplitPaymentRow[]>([
    { id: "split-1", method: "CASH", amount: "" },
    { id: "split-2", method: "NEQUI", amount: "" }
  ]);
  const [cashReceived, setCashReceived] = useState("");
  const operationLock = useRef(false);
  const reprintLock = useRef(false);
  const ticketInputRef = useRef<HTMLInputElement>(null);
  const { playSuccess, playError } = useOperationSounds();
  const { success: toastSuccess, error: toastError } = useToast();

  // Auto-focus en campo de ticket al cargar
  useEffect(() => {
    const timer = setTimeout(() => {
      ticketInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // PERFORMANCE: Constant value, no need for useMemo
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:6011/api/v1/operations";

  const totalDue = Number(active?.total ?? active?.receipt.totalAmount ?? 0);
  const isSplitPayment = selectedPaymentMethod === "MIXED";
  const splitTotal = splitPayments.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const singleCashReceived = selectedPaymentMethod === "CASH" ? Number(cashReceived) || 0 : 0;
  const splitCashReceived = isSplitPayment
    ? splitPayments
        .filter((row) => row.method === "CASH")
        .reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
    : 0;
  const receivedForChange = selectedPaymentMethod === "CASH" ? singleCashReceived : splitCashReceived;
  const changeDue = Math.max(0, receivedForChange - totalDue);
  const splitRemaining = Math.max(0, totalDue - splitTotal);

  const paymentLabel = useCallback((code: PaymentMethodCode) => {
    return PAYMENT_METHODS.find((method) => method.code === code)?.label ?? code;
  }, []);

  const paymentObservation = useCallback((method: PaymentMethodCode) => {
    if (method === "MIXED") {
      const detail = splitPayments
        .filter((row) => (Number(row.amount) || 0) > 0)
        .map((row) => `${paymentLabel(row.method)} $${Number(row.amount).toLocaleString("es-CO")}`)
        .join(" + ");
      return `Pago dividido: ${detail}. Total recibido $${splitTotal.toLocaleString("es-CO")}.`;
    }
    if (method === "CASH" && singleCashReceived > 0) {
      return `Pago en efectivo: recibido $${singleCashReceived.toLocaleString("es-CO")}; vuelto $${changeDue.toLocaleString("es-CO")}.`;
    }
    return null;
  }, [changeDue, paymentLabel, singleCashReceived, splitPayments, splitTotal]);

  const lookup = useCallback(async () => {
    setError("");
    setMessage("");

    const locator = ticketNumber.trim() || plate.trim();
    if (!locator) {
      setError("Ingresa ticket o placa");
      return;
    }

    const params = new URLSearchParams();
    if (ticketNumber.trim()) {
      params.set("ticketNumber", ticketNumber.trim());
    } else {
      params.set("plate", plate.trim().toUpperCase());
    }
    if (agreementCode.trim()) {
      params.set("agreementCode", agreementCode.trim());
    }

    setSearching(true);
    setPreviewLines(null);
    try {
      const response = await fetch(`${apiBase}/sessions/active?${params.toString()}`, {
        headers: await buildApiHeaders()
      });
      const payload = await response.json();
      if (!response.ok) {
        setActive(null);
        setError(payload.error ?? "No se encontro sesion activa");
        playError();
        return;
      }
      setActive(payload);
      setSelectedPaymentMethod("CASH");
      setCashReceived("");
      setSplitPayments([
        { id: "split-1", method: "CASH", amount: "" },
        { id: "split-2", method: "NEQUI", amount: "" }
      ]);
      if (payload.receipt.agreementCode) {
        setAgreementCode(payload.receipt.agreementCode);
      }
      playSuccess();
    } catch {
      setError("Error de red buscando sesion");
      playError();
    } finally {
      setSearching(false);
    }
  }, [ticketNumber, plate, agreementCode, apiBase, playSuccess, playError]);

  const processExit = useCallback(async (paymentMethod: PaymentMethodCode = selectedPaymentMethod) => {
    if (!active) {
      setError("Primero busca una sesion activa");
      return;
    }
    if (paymentMethod === "MIXED") {
      if (splitPayments.filter((row) => (Number(row.amount) || 0) > 0).length < 2) {
        setError("Para pago dividido registra al menos dos medios con valor.");
        return;
      }
      if (Math.abs(splitTotal - totalDue) > 0.009) {
        setError(`El pago dividido debe sumar $${totalDue.toLocaleString("es-CO")}. Falta $${Math.max(0, totalDue - splitTotal).toLocaleString("es-CO")}.`);
        return;
      }
    }
    if (paymentMethod === "CASH" && singleCashReceived > 0 && singleCashReceived < totalDue) {
      setError(`El efectivo recibido es menor al total. Falta $${(totalDue - singleCashReceived).toLocaleString("es-CO")}.`);
      return;
    }
    if (operationLock.current) {
      return;
    }
    operationLock.current = true;

    setProcessing(true);
    setError("");
    setMessage("");

    try {
      const user = await currentUser();
      if (!user?.id) {
        setError("Sesion requerida para registrar salida");
        return;
      }

      const requestBody = validatePayloadOrThrow(operationExitRequestSchema, {
        idempotencyKey: newIdempotencyKey(),
        ticketNumber: active.receipt.ticketNumber,
        operatorUserId: user.id,
        paymentMethod,
        observations: paymentObservation(paymentMethod),
        vehicleCondition,
        conditionChecklist: conditionChecklist
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        conditionPhotoUrls: conditionPhotoUrls
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        agreementCode: agreementCode.trim() || null
      });

      const response = await fetch(`${apiBase}/exits`, {
        method: "POST",
        headers: await buildApiHeaders(),
        body: JSON.stringify(requestBody)
      });
      const payload = await response.json();
      if (!response.ok) {
        let errMsg = typeof payload.error === "string" ? payload.error : "No se pudo registrar la salida";
        if (/caja/i.test(errMsg)) {
          try {
            const site = active.receipt.site ?? undefined;
            const pol = await cashPolicy(site ?? null);
            errMsg = `${errMsg} ${pol.operationsHint}`.trim();
          } catch {
            /* keep base message */
          }
        }
        setError(errMsg);
        toastError(errMsg);
        playError();
        return;
      }

      const printPayload = operationPrintPayload(payload);
      setPreviewLines(buildTicketPreviewForOperation(printPayload, "EXIT"));

      let printWarning: string | null = null;
      try {
        printWarning = await printReceiptIfTauri(printPayload, "EXIT");
      } catch (printError) {
        printWarning =
          printError instanceof Error
            ? `No se pudo imprimir en desktop: ${printError.message}`
            : "No se pudo imprimir en desktop.";
      }
      
      playSuccess();
      toastSuccess(
        `Salida registrada. Total: $${Number(payload.total ?? 0).toLocaleString("es-CO")}${
          printWarning ? `. ${printWarning}` : ""
        }`,
        6000
      );
      setActive(null);
      setTicketNumber("");
      setPlate("");
      setAgreementCode("");
      
      // Re-focus para siguiente operación
      setTimeout(() => {
        ticketInputRef.current?.focus();
      }, 100);
    } catch (err) {
      const validationMessage = toUserMessageFromClientValidation(err);
      if (validationMessage) {
        setError(validationMessage);
        toastError(validationMessage);
        playError();
        return;
      }
      const queued = await queueOfflineOperation("EXIT_RECORDED", {
        ticketNumber: active.receipt.ticketNumber,
        paymentMethod,
        paymentBreakdown: paymentMethod === "MIXED" ? splitPayments : undefined,
        occurredAtIso: new Date().toISOString(),
        origin: "OFFLINE_PENDING_SYNC"
      });
      if (queued) {
        toastSuccess("Sin internet: salida guardada. Se sincronizará automáticamente al reconectar.");
        playSuccess();
      } else {
        const errMsg = "Error de red procesando salida";
        setError(errMsg);
        toastError(errMsg);
        playError();
      }
    } finally {
      setProcessing(false);
      operationLock.current = false;
    }
  }, [active, apiBase, selectedPaymentMethod, splitPayments, splitTotal, totalDue, singleCashReceived, paymentObservation, vehicleCondition, conditionChecklist, conditionPhotoUrls, agreementCode, playSuccess, playError, toastSuccess, toastError]);

  // Keyboard shortcuts - definido después de processExit
  useExitShortcuts({
    onCashPayment: () => processExit("CASH"),
    onCardPayment: () => processExit("DEBIT_CARD"),
    onSearch: lookup,
    isActive: !!active && !processing
  });

  const reprintTicket = async () => {
    if (!active) return;
    if (reprintLock.current) {
      return;
    }
    reprintLock.current = true;
    setPreviewLines(null);
    setError("");
    setMessage("");
    try {
      const user = await currentUser();
      if (!user?.id) {
        setError("Sesion requerida para reimprimir");
        return;
      }

      const requestBody = validatePayloadOrThrow(operationReprintRequestSchema, {
        idempotencyKey: newIdempotencyKey(),
        ticketNumber: active.receipt.ticketNumber,
        operatorUserId: user.id,
        reason: reprintReason
      });

      const response = await fetch(`${apiBase}/tickets/reprint`, {
        method: "POST",
        headers: await buildApiHeaders(),
        body: JSON.stringify(requestBody)
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "No se pudo reimprimir");
        return;
      }
      const printPayload = operationPrintPayload(payload);
      setPreviewLines(buildTicketPreviewForOperation(printPayload, "REPRINT"));
      let printWarning: string | null = null;
      try {
        printWarning = await printReceiptIfTauri(printPayload, "REPRINT");
      } catch (printError) {
        printWarning =
          printError instanceof Error
            ? `No se pudo imprimir en desktop: ${printError.message}`
            : "No se pudo imprimir en desktop.";
      }
      playSuccess();
      setMessage(
        `Ticket reimpreso (${payload.receipt.ticketNumber})${printWarning ? `. ${printWarning}` : ""}`
      );
      setActive(payload);
    } catch (err) {
      const validationMessage = toUserMessageFromClientValidation(err);
      if (validationMessage) {
        setError(validationMessage);
        playError();
        return;
      }
      const queued = await queueOfflineOperation("TICKET_REPRINTED", {
        ticketNumber: active.receipt.ticketNumber,
        reason: reprintReason,
        occurredAtIso: new Date().toISOString(),
        origin: "OFFLINE_PENDING_SYNC"
      });
      if (queued) {
        setMessage("Sin internet: reimpresion en cola offline.");
        playSuccess();
      } else {
        setError("Error de red en reimpresion");
        playError();
      }
    } finally {
      // UX: Debounce delay to prevent rapid double-clicks
      setTimeout(() => {
        reprintLock.current = false;
      }, 500);
    }
  };

  const lostTicket = async () => {
    if (!active) return;
    if (operationLock.current) {
      return;
    }
    operationLock.current = true;
    setProcessing(true);
    setError("");
    setMessage("");
    try {
      const user = await currentUser();
      if (!user?.id) {
        setError("Sesion requerida para procesar ticket perdido");
        playError();
        return;
      }

      const requestBody = validatePayloadOrThrow(operationLostTicketRequestSchema, {
        idempotencyKey: newIdempotencyKey(),
        ticketNumber: active.receipt.ticketNumber,
        operatorUserId: user.id,
        reason: lostReason,
        paymentMethod: "CASH"
      });

      const response = await fetch(`${apiBase}/tickets/lost`, {
        method: "POST",
        headers: await buildApiHeaders(),
        body: JSON.stringify(requestBody)
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "No se pudo procesar ticket perdido");
        playError();
        return;
      }
      const printPayload = operationPrintPayload(payload);
      setPreviewLines(buildTicketPreviewForOperation(printPayload, "LOST_TICKET"));
      let printWarning: string | null = null;
      try {
        printWarning = await printReceiptIfTauri(printPayload, "LOST_TICKET");
      } catch (printError) {
        printWarning =
          printError instanceof Error
            ? `No se pudo imprimir en desktop: ${printError.message}`
            : "No se pudo imprimir en desktop.";
      }
      playSuccess();
      setMessage(
        `Ticket perdido procesado. Total: $ ${Number(payload.total ?? 0).toLocaleString("es-CO")}${
          printWarning ? `. ${printWarning}` : ""
        }`
      );
      setActive(null);
      setTimeout(() => {
        ticketInputRef.current?.focus();
      }, 100);
    } catch (err) {
      const validationMessage = toUserMessageFromClientValidation(err);
      if (validationMessage) {
        setError(validationMessage);
        playError();
        return;
      }
      const queued = await queueOfflineOperation("LOST_TICKET", {
        ticketNumber: active.receipt.ticketNumber,
        reason: lostReason,
        occurredAtIso: new Date().toISOString(),
        origin: "OFFLINE_PENDING_SYNC"
      });
      if (queued) {
        setMessage("Sin internet: operacion de ticket perdido en cola offline.");
        playSuccess();
      } else {
        setError("Error de red procesando ticket perdido");
        playError();
      }
    } finally {
      setProcessing(false);
      operationLock.current = false;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">
          Salida y cobro
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Finalizar servicio</h1>
      </div>
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="surface rounded-2xl p-4 sm:p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Busqueda</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              ref={ticketInputRef}
              label="Número de ticket"
              variant="flat"
              value={ticketNumber}
              onValueChange={setTicketNumber}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  lookup();
                }
              }}
              endContent={
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                  Enter
                </span>
              }
            />
            <Input
              label="Placa"
              variant="flat"
              value={plate}
              onValueChange={(val) => setPlate(val.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  lookup();
                }
              }}
              endContent={
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                  Placa
                </span>
              }
            />
          </div>
          <div className="mt-4">
            <Input
              label="Código de convenio (opcional)"
              placeholder="CONV-123"
              variant="flat"
              value={agreementCode}
              onValueChange={setAgreementCode}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  lookup();
                }
              }}
              classNames={{
                input: "uppercase font-mono",
              }}
            />
          </div>
          <div className="mt-4">
            <Button
              color="primary"
              className="font-bold w-full sm:w-auto"
              onPress={lookup}
              isLoading={searching}
              isDisabled={processing}
              startContent={
                !searching && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )
              }
            >
              Buscar sesion (Ctrl+Enter)
            </Button>
          </div>

          {active ? (
            <>
              {/* Tarjeta de resultado con total destacado */}
              <div className="mt-6 bg-gradient-to-br from-brand-50 to-amber-50 border-2 border-brand-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <Badge label="Sesion Activa" tone="warning" />
                    <p className="text-sm text-slate-600 font-medium">Placa: {active.receipt.plate}</p>
                  </div>
                </div>

                {/* Total destacado */}
                <div className="bg-white rounded-xl p-4 mb-4 text-center border border-brand-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total a pagar</p>
                  <p className="text-4xl font-bold text-slate-900">
                    ${totalDue.toLocaleString("es-CO")}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Tiempo: {active.receipt.duration} • {active.receipt.rateName ?? "Tarifa estándar"}
                  </p>
                  {(active.receipt.entryMode && active.receipt.entryMode !== "VISITOR") ? (
                    <p className="text-sm font-semibold text-emerald-700 mt-2">
                      {ENTRY_MODE_LABEL[active.receipt.entryMode] ?? active.receipt.entryMode}: cobro a puerta $0 (mensualidad / cortesía)
                    </p>
                  ) : active.receipt.monthlySession ? (
                    <p className="text-sm font-semibold text-emerald-700 mt-2">
                      Mensualidad activa: cobro $0
                    </p>
                  ) : null}
                  {(active.receipt.prepaidMinutes && active.receipt.prepaidMinutes > 0) ? (
                    <p className="text-xs font-medium text-emerald-600 mt-1">
                      Minutos prepagados aplicados: {active.receipt.prepaidMinutes} min
                    </p>
                  ) : null}
                  {(() => {
                    const sub = Number(active.subtotal ?? 0);
                    const sur = Number(active.surcharge ?? 0);
                    const tot = Number(active.total ?? active.receipt.totalAmount ?? 0);
                    const reference = sub + sur;
                    const discount = Math.max(0, reference - tot);
                    if (reference <= 0 && discount <= 0) {
                      return null;
                    }
                    return (
                      <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1 text-left">
                        {sub > 0 ? (
                          <p>Subtotal tarifa: ${sub.toLocaleString("es-CO")}</p>
                        ) : null}
                        {sur > 0 ? (
                          <p>Recargos: ${sur.toLocaleString("es-CO")}</p>
                        ) : null}
                        {discount > 0.009 ? (
                          <p className="text-emerald-700 font-medium">
                            Valor no cobrado (cortesía / convenio / descuento): ${discount.toLocaleString("es-CO")}
                          </p>
                        ) : null}
                        {active.receipt.agreementCode ? (
                          <p className="text-[10px] text-slate-400 mt-1 uppercase">
                            Convenio aplicado: {active.receipt.agreementCode}
                          </p>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/70 rounded-lg p-3">
                    <span className="text-slate-500">Ticket:</span>
                    <span className="font-mono font-medium ml-1">{active.receipt.ticketNumber}</span>
                  </div>
                  <div className="bg-white/70 rounded-lg p-3">
                    <span className="text-slate-500">Reimpresiones:</span>
                    <span className="font-medium ml-1">{active.receipt.reprintCount}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Textarea
                  label="Estado del vehículo"
                  placeholder="Sin novedades a la salida..."
                  variant="flat"
                  value={vehicleCondition}
                  onValueChange={setVehicleCondition}
                />
              </div>
            </>
          ) : null}

          {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
          {previewLines ? (
            <TicketReceiptPreview lines={previewLines} paperWidthMm={resolvePaperWidthMm()} />
          ) : null}
        </div>
        <div className="surface rounded-2xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Acciones</h2>
          <p className="mt-2 text-sm text-slate-600">
            {active
              ? "Seleccione el medio real de pago o use mixto para pago dividido."
              : "Busque una sesion activa para habilitar cobros."}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Salida rápida: F2 abre esta pantalla; Ctrl+Enter ejecuta la búsqueda; con sesión activa use 1 (efectivo) o 2 (tarjeta débito).
          </p>

          <div className="mt-4">
            <Select
              label="Medio de pago"
              variant="flat"
              selectedKeys={[selectedPaymentMethod]}
              onSelectionChange={(keys) => {
                const next = Array.from(keys)[0] as PaymentMethodCode | undefined;
                if (next) setSelectedPaymentMethod(next);
              }}
              isDisabled={!active || searching || processing}
            >
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method.code}>{method.label}</SelectItem>
              ))}
            </Select>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            {PAYMENT_METHODS.map((method, index) => (
              <Button
                key={method.code}
                className={`min-h-14 justify-start text-left font-bold ${
                  active && !processing
                    ? `${method.tone} text-white shadow-md`
                    : "bg-slate-200 text-slate-400"
                } ${selectedPaymentMethod === method.code ? "ring-2 ring-offset-2 ring-slate-900" : ""}`}
                isDisabled={!active || searching || processing}
                onPress={() => setSelectedPaymentMethod(method.code)}
              >
                <div className={`w-8 h-8 rounded-lg flex shrink-0 items-center justify-center text-sm ${active && !processing ? "bg-white/20" : "bg-slate-300"}`}>
                  {index < 9 ? index + 1 : "•"}
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base leading-tight">{method.label}</div>
                  <div className="text-[11px] opacity-85 font-normal leading-tight">{method.hint}</div>
                </div>
              </Button>
            ))}
          </div>

          {active && selectedPaymentMethod === "CASH" ? (
            <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-3 space-y-3">
              <Input
                label="Recibido en efectivo"
                variant="flat"
                type="number"
                value={cashReceived}
                onValueChange={setCashReceived}
                placeholder={String(totalDue)}
              />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-white p-3 border border-emerald-100">
                  <p className="text-xs uppercase text-slate-500">Cambio</p>
                  <p className="text-lg font-bold text-emerald-700">${changeDue.toLocaleString("es-CO")}</p>
                </div>
                <div className="rounded-lg bg-white p-3 border border-emerald-100">
                  <p className="text-xs uppercase text-slate-500">Vuelto</p>
                  <p className="text-lg font-bold text-emerald-700">${changeDue.toLocaleString("es-CO")}</p>
                </div>
              </div>
            </div>
          ) : null}

          {active && isSplitPayment ? (
            <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Pago dividido</p>
                  <p className="text-xs text-slate-600">
                    Suma: ${splitTotal.toLocaleString("es-CO")} / ${totalDue.toLocaleString("es-CO")}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() =>
                    setSplitPayments((rows) => [
                      ...rows,
                      { id: `split-${Date.now()}`, method: "TRANSFER", amount: "" }
                    ])
                  }
                  isDisabled={processing}
                >
                  Agregar
                </Button>
              </div>

              {splitPayments.map((row) => (
                <div key={row.id} className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
                  <Select
                    label="Medio"
                    size="sm"
                    variant="flat"
                    selectedKeys={[row.method]}
                    onSelectionChange={(keys) => {
                      const next = Array.from(keys)[0] as SplitPaymentRow["method"] | undefined;
                      if (!next) return;
                      setSplitPayments((rows) =>
                        rows.map((item) => (item.id === row.id ? { ...item, method: next } : item))
                      );
                    }}
                  >
                    {SPLIT_METHODS.map((method) => (
                      <SelectItem key={method.code}>{method.label}</SelectItem>
                    ))}
                  </Select>
                  <Input
                    label="Valor"
                    size="sm"
                    variant="flat"
                    type="number"
                    value={row.amount}
                    onValueChange={(value) =>
                      setSplitPayments((rows) =>
                        rows.map((item) => (item.id === row.id ? { ...item, amount: value } : item))
                      )
                    }
                  />
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    isDisabled={splitPayments.length <= 2}
                    onPress={() => setSplitPayments((rows) => rows.filter((item) => item.id !== row.id))}
                  >
                    Quitar
                  </Button>
                </div>
              ))}

              <div className={`rounded-lg p-3 text-sm font-semibold ${
                Math.abs(splitTotal - totalDue) <= 0.009
                  ? "bg-white text-emerald-700 border border-emerald-100"
                  : "bg-white text-amber-700 border border-amber-100"
              }`}>
                {Math.abs(splitTotal - totalDue) <= 0.009
                  ? "Pago dividido completo"
                  : `Falta por distribuir: $${splitRemaining.toLocaleString("es-CO")}`}
              </div>
              {splitCashReceived > totalDue ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-white p-3 border border-teal-100">
                    <p className="text-xs uppercase text-slate-500">Cambio</p>
                    <p className="text-lg font-bold text-emerald-700">${changeDue.toLocaleString("es-CO")}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-teal-100">
                    <p className="text-xs uppercase text-slate-500">Vuelto</p>
                    <p className="text-lg font-bold text-emerald-700">${changeDue.toLocaleString("es-CO")}</p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <Button
            className="mt-5 h-14 w-full font-bold bg-slate-900 text-white"
            isDisabled={!active || searching || processing}
            isLoading={processing}
            onPress={() => processExit()}
          >
            Registrar pago y salida
          </Button>

          {/* Calculadora de cambio - Solo visible cuando hay monto */}
          {active && selectedPaymentMethod === "CASH" && (
            <div className="mt-6">
              <ChangeCalculator 
                totalAmount={totalDue} 
              />
            </div>
          )}

          {/* Acciones secundarias */}
          <div className="mt-8 pt-6 border-t border-slate-200 space-y-6">
            <div className="space-y-3">
              <Input
                label="Motivo reimpresión"
                variant="flat"
                size="sm"
                value={reprintReason}
                onValueChange={setReprintReason}
              />
              <Button
                fullWidth
                variant="flat"
                color="primary"
                className="font-semibold"
                isDisabled={!active || searching || processing}
                onPress={reprintTicket}
              >
                Reimprimir ticket
              </Button>
            </div>
            
            <div className="space-y-3">
              <Input
                label="Motivo ticket perdido"
                variant="flat"
                size="sm"
                value={lostReason}
                onValueChange={setLostReason}
              />
              <Button
                fullWidth
                variant="flat"
                color="primary"
                className="font-semibold"
                isDisabled={!active || searching || processing}
                onPress={lostTicket}
              >
                Procesar ticket perdido
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
