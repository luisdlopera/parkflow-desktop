"use client";

import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";

import { useRef, useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ListBox } from "@heroui/react";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import Badge from "@/components/ui/Badge";
import TicketReceiptPreview from "@/components/tickets/TicketReceiptPreview";
import { ChangeCalculator } from "@/components/ui/ChangeCalculator";
import { buildApiHeaders } from "@/lib/api";
import { newIdempotencyKey, getOrCreateIdempotencyKey, clearIdempotencyKey } from "@/lib/idempotency";
import { queueOfflineOperation } from "@/lib/offline-outbox";
import { cashPolicy, cashCurrent } from "@/lib/cash/cash-api";
import {
  buildTicketPreviewForOperation,
  printReceiptIfTauri,
  resolvePaperWidthMm,
  type OperationPayload
} from "@/lib/tauri-print";
import type { VehicleType } from "@parkflow/types";
import { useExitShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useOperationSounds } from "@/lib/hooks/useOperationSounds";
import { toast } from "@heroui/react";
import { currentUser } from "@/lib/auth";
import TicketPrintWarning from "@/components/tickets/TicketPrintWarning";
import { downloadTicketAsHtml } from "@/lib/print/ticket-download";
import {
  operationExitRequestSchema,
  operationLostTicketRequestSchema,
  operationReprintRequestSchema
} from "@/lib/validation/contracts";
import { toUserMessageFromClientValidation, validatePayloadOrThrow } from "@/lib/validation/request-guard";
import { useTenantConfig } from "@/lib/hooks/useTenantConfig";
import { useRuntimeConfig } from "@/lib/useRuntimeConfig";

type CustodiedItemInfo = {
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
    custodiedItems?: CustodiedItemInfo[];
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
  { code: "CASH", label: "Efectivo", hint: "Cambio / vuelto", tone: "bg-emerald-500 hover:bg-emerald-600 border border-default-200" },
  { code: "DEBIT_CARD", label: "Tarjeta débito", hint: "Datáfono débito", tone: "bg-sky-500 hover:bg-sky-600 border border-default-200" },
  { code: "CREDIT_CARD", label: "Tarjeta crédito", hint: "Datáfono crédito", tone: "bg-indigo-500 hover:bg-indigo-600 border border-default-200" },
  { code: "QR", label: "QR", hint: "Código QR", tone: "bg-slate-700 hover:bg-slate-800 border border-default-200" },
  { code: "NEQUI", label: "Nequi", hint: "Referencia requerida", tone: "bg-fuchsia-500 hover:bg-fuchsia-600 border border-default-200" },
  { code: "DAVIPLATA", label: "Daviplata", hint: "Referencia requerida", tone: "bg-rose-500 hover:bg-rose-600 border border-default-200" },
  { code: "TRANSFER", label: "Transferencia", hint: "Banco / referencia", tone: "bg-cyan-600 hover:bg-cyan-700 border border-default-200" },
  { code: "AGREEMENT", label: "Convenio", hint: "Empresa aliada", tone: "bg-amber-500 hover:bg-amber-600 border border-default-200" },
  { code: "INTERNAL_CREDIT", label: "Crédito interno", hint: "Cartera interna", tone: "bg-violet-500 hover:bg-violet-600 border border-default-200" },
  { code: "OTHER", label: "Otro", hint: "Caso especial", tone: "bg-zinc-500 hover:bg-zinc-600 border border-default-200" },
  { code: "MIXED", label: "Mixto", hint: "Pago dividido", tone: "bg-teal-600 hover:bg-teal-700 border border-default-200" },
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

function validatePayment(
  paymentMethod: PaymentMethodCode,
  splitPayments: SplitPaymentRow[],
  splitTotal: number,
  totalDue: number,
  singleCashReceived: number
): string | null {
  if (paymentMethod === "MIXED") {
    const validSplits = splitPayments.filter((row) => (Number(row.amount) || 0) > 0);
    if (validSplits.length < 2) {
      return "Para pago dividido registra al menos dos medios con valor.";
    }
    if (Math.abs(splitTotal - totalDue) > 0.009) {
      return `El pago dividido debe sumar $${totalDue.toLocaleString("es-CO")}. Falta $${Math.max(0, totalDue - splitTotal).toLocaleString("es-CO")}.`;
    }
  }
  if (paymentMethod === "CASH" && singleCashReceived > 0 && singleCashReceived < totalDue) {
    return `El efectivo recibido es menor al total. Falta $${(totalDue - singleCashReceived).toLocaleString("es-CO")}.`;
  }
  return null;
}

async function executePrintReceipt(
  printPayload: OperationPayload,
  documentKind: "EXIT" | "ENTRY" | "REPRINT" | "LOST_TICKET"
): Promise<string | null> {
  try {
    return await printReceiptIfTauri(printPayload, documentKind);
  } catch (printError) {
    return printError instanceof Error
      ? `No se pudo imprimir en desktop: ${printError.message}`
      : "No se pudo imprimir en desktop.";
  }
}

async function handleOfflineExit(
  ticketNumber: string,
  paymentMethod: PaymentMethodCode,
  splitPayments: SplitPaymentRow[],
  idempotencyFingerprint: string,
  playSuccess: () => void,
  toastSuccess: (msg: string) => void,
  playError: () => void,
  toastError: (msg: string) => void,
  setError: (msg: string) => void
): Promise<boolean> {
  const queued = await queueOfflineOperation("EXIT_RECORDED", {
    ticketNumber,
    paymentMethod,
    paymentBreakdown: paymentMethod === "MIXED" ? splitPayments : undefined,
    occurredAtIso: new Date().toISOString(),
    origin: "OFFLINE_PENDING_SYNC"
  });
  if (queued) {
    clearIdempotencyKey("exit", idempotencyFingerprint);
    toastSuccess("Sin internet: salida guardada. Se sincronizará automáticamente al reconectar.");
    playSuccess();
    return true;
  }
  const errMsg = "Error de red procesando salida";
  setError(errMsg);
  toastError(errMsg);
  playError();
  return false;
}

export default function SalidaCobroPage() {
  const searchParams = useSearchParams();
  const initialTicketNumber = searchParams?.get("ticketNumber")?.trim() ?? "";
  const initialPlate = searchParams?.get("plate")?.trim().toUpperCase() ?? "";
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
  const [pendingCustodiedItems, setPendingCustodiedItems] = useState<CustodiedItemInfo[]>([]);
  const [returnConfirmedIds, setReturnConfirmedIds] = useState<string[]>([]);
  const operationLock = useRef(false);
  const reprintLock = useRef(false);
  const ticketInputRef = useRef<HTMLInputElement>(null);
  const { playSuccess, playError } = useOperationSounds();
  const toastSuccess = toast.success;
  const toastError = toast.danger;
  const [reprintLoading, setReprintLoading] = useState(false);
  const { getOperationConfigValue } = useTenantConfig();
  const enableVehicleCondition = getOperationConfigValue<boolean>("enableVehicleCondition", true);
  const enableCustodiedItem = getOperationConfigValue<boolean>("enableCustodiedItem", true);
  const [printWarning, setPrintWarning] = useState<{ ticketNumber: string; plate: string; previewLines: string[] } | null>(null);
  const autoLookupDone = useRef(false);

  const { hasPaymentMethod } = useRuntimeConfig();

  // Auto-focus en campo de ticket al cargar
  useEffect(() => {
    const timer = setTimeout(() => {
      ticketInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (initialTicketNumber) {
      setTicketNumber(initialTicketNumber);
    }
    if (initialPlate) {
      setPlate(initialPlate);
    }
  }, [initialTicketNumber, initialPlate]);

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

  const lookup = useCallback(async (override?: { ticketNumber?: string; plate?: string }) => {
    setError("");
    setMessage("");
    setPrintWarning(null);

    const currentTicketNumber = override?.ticketNumber ?? ticketNumber;
    const currentPlate = override?.plate ?? plate;
    const locator = currentTicketNumber.trim() || currentPlate.trim();
    if (!locator) {
      setError("Ingresa ticket o placa");
      return;
    }

    const params = new URLSearchParams();
    if (currentTicketNumber.trim()) {
      params.set("ticketNumber", currentTicketNumber.trim());
    } else {
      params.set("plate", currentPlate.trim().toUpperCase());
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
      const pending = (payload.receipt.custodiedItems ?? []).filter(
        (item: CustodiedItemInfo) => item.status === "RECEIVED"
      );
      setPendingCustodiedItems(pending);
      setReturnConfirmedIds(pending.map((item: CustodiedItemInfo) => item.id));
      playSuccess();
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, FrontendActionError.LOAD_DATA));
      playError();
    } finally {
      setSearching(false);
    }
  }, [ticketNumber, plate, agreementCode, apiBase, playSuccess, playError]);

  useEffect(() => {
    if (autoLookupDone.current) {
      return;
    }
    if (!initialTicketNumber && !initialPlate) {
      return;
    }

    autoLookupDone.current = true;
    void lookup({ ticketNumber: initialTicketNumber, plate: initialPlate });
  }, [initialPlate, initialTicketNumber, lookup]);

  const handleLookupClick = useCallback(() => {
    void lookup();
  }, [lookup]);

  const processExit = useCallback(async (paymentMethod: PaymentMethodCode = selectedPaymentMethod) => {
    if (!active) {
      setError("Primero busca una sesion activa");
      return;
    }
    const validationError = validatePayment(paymentMethod, splitPayments, splitTotal, totalDue, singleCashReceived);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (operationLock.current) {
      return;
    }
    operationLock.current = true;

    setProcessing(true);
    setError("");
    setMessage("");
    setPrintWarning(null);

    try {
      const user = await currentUser();
      if (!user?.id) {
        setError("Sesion requerida para registrar salida");
        return;
      }

      // Validate cash register is open before allowing exit
      const term = process.env.NEXT_PUBLIC_TERMINAL_ID?.trim() ||
        window.localStorage.getItem("parkflow_terminal_id")?.trim() || "";
      const site = process.env.NEXT_PUBLIC_PARKING_SITE?.trim() || "default";
      let cashSessionId: string | null = null;
      try {
        const cs = await cashCurrent(site, term || undefined);
        cashSessionId = cs.id;
      } catch (err) {
        setError("Debe abrir caja en este terminal antes de procesar salidas");
        setProcessing(false);
        operationLock.current = false;
        return;
      }

      const idempotencyFingerprint = JSON.stringify({
        ticketNumber: active.receipt.ticketNumber,
        paymentMethod,
        total: totalDue
      });
      const idempotencyKey = getOrCreateIdempotencyKey("exit", idempotencyFingerprint);
      const requestBody = validatePayloadOrThrow(operationExitRequestSchema, {
        idempotencyKey,
        ticketNumber: active.receipt.ticketNumber,
        operatorUserId: user.id,
        paymentMethod,
        cashSessionId,
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
        agreementCode: agreementCode.trim() || null,
        returnedItemIds: pendingCustodiedItems.length > 0 ? returnConfirmedIds : undefined,
        custodiedItemObservations: pendingCustodiedItems.length > 0 ? "Devuelto en salida" : null
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
          } catch (err) {
            /* keep base message */
          }
        }
        setError(errMsg);
        toastError(errMsg);
        playError();
        return;
      }

      clearIdempotencyKey("exit", idempotencyFingerprint);

      const printPayload = operationPrintPayload(payload);
      const receiptPreview = buildTicketPreviewForOperation(printPayload, "EXIT");
      setPreviewLines(receiptPreview);

      const printWarningMsg = await executePrintReceipt(printPayload, "EXIT");
      if (printWarningMsg) {
        setPrintWarning({
          ticketNumber: payload.receipt.ticketNumber,
          plate: payload.receipt.plate,
          previewLines: receiptPreview
        });
      } else {
        playSuccess();
        toast.success(`Salida registrada. Total: $${Number(payload.total ?? 0).toLocaleString("es-CO")}`);
        setActive(null);
        setTicketNumber("");
        setPlate("");
        setAgreementCode("");

        // Re-focus para siguiente operación
        setTimeout(() => {
          ticketInputRef.current?.focus();
        }, 100);
      }
    } catch (err) {
      const validationMessage = toUserMessageFromClientValidation(err);
      if (validationMessage) {
        setError(validationMessage);
        toast.danger(validationMessage);
        playError();
        return;
      }
      const idempotencyFingerprint = JSON.stringify({
        ticketNumber: active.receipt.ticketNumber,
        paymentMethod,
        total: totalDue
      });
      const isQueued = await handleOfflineExit(
        active.receipt.ticketNumber,
        paymentMethod,
        splitPayments,
        idempotencyFingerprint,
        playSuccess,
        toast.success,
        playError,
        toast.danger,
        setError
      );
      if (isQueued) {
        setActive(null);
        setTicketNumber("");
        setPlate("");
        setAgreementCode("");
        setTimeout(() => {
          ticketInputRef.current?.focus();
        }, 100);
      }
    } finally {
      setProcessing(false);
      operationLock.current = false;
    }
  }, [active, apiBase, selectedPaymentMethod, splitPayments, splitTotal, totalDue, singleCashReceived, paymentObservation, vehicleCondition, conditionChecklist, conditionPhotoUrls, agreementCode, playSuccess, playError, toastError, pendingCustodiedItems.length, returnConfirmedIds]);

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
    setReprintLoading(true);
    setPreviewLines(null);
    setError("");
    setMessage("");
    const idempotencyFingerprint = JSON.stringify({
      ticketNumber: active.receipt.ticketNumber,
      reason: reprintReason
    });
    try {
      const user = await currentUser();
      if (!user?.id) {
        setError("Sesion requerida para reimprimir");
        return;
      }

      const idempotencyKey = getOrCreateIdempotencyKey("reprint", idempotencyFingerprint);
      const requestBody = validatePayloadOrThrow(operationReprintRequestSchema, {
        idempotencyKey,
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

      clearIdempotencyKey("reprint", idempotencyFingerprint);
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
      if (printWarning) {
        setPrintWarning({
          ticketNumber: payload.receipt.ticketNumber,
          plate: payload.receipt.plate,
          previewLines: buildTicketPreviewForOperation(printPayload, "REPRINT")
        });
      } else {
        playSuccess();
        setMessage(`Ticket reimpreso (${payload.receipt.ticketNumber})`);
        setActive(payload);
      }
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
        clearIdempotencyKey("reprint", idempotencyFingerprint);
        toast.danger("Recibo guardado offline, pero no se pudo contactar a la impresora. Verifique la conexión.");
        playSuccess();
      } else {
        setError(getUserFriendlyErrorMessage(err, FrontendActionError.PRINT_ACTION));
        playError();
      }
    } finally {
      // UX: Debounce delay to prevent rapid double-clicks
      setTimeout(() => {
        reprintLock.current = false;
        setReprintLoading(false);
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
    setPrintWarning(null);
    const idempotencyFingerprint = JSON.stringify({
      ticketNumber: active.receipt.ticketNumber,
      reason: lostReason
    });

    try {
      const user = await currentUser();
      if (!user?.id) {
        setError("Sesion requerida para procesar ticket perdido");
        playError();
        return;
      }

      const idempotencyKey = getOrCreateIdempotencyKey("lost_ticket", idempotencyFingerprint);
      const requestBody = validatePayloadOrThrow(operationLostTicketRequestSchema, {
        idempotencyKey,
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

      clearIdempotencyKey("lost_ticket", idempotencyFingerprint);
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
      if (printWarning) {
        setPrintWarning({
          ticketNumber: payload.receipt.ticketNumber,
          plate: payload.receipt.plate,
          previewLines: buildTicketPreviewForOperation(printPayload, "LOST_TICKET")
        });
      } else {
        playSuccess();
        setMessage(
          `Ticket perdido procesado. Total: $ ${Number(payload.total ?? 0).toLocaleString("es-CO")}`
        );
        setActive(null);
        setTimeout(() => {
          ticketInputRef.current?.focus();
        }, 100);
      }
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
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {printWarning ? (
        <TicketPrintWarning
          ticketNumber={printWarning.ticketNumber}
          plate={printWarning.plate}
          previewLines={printWarning.previewLines}
          onDownload={() => downloadTicketAsHtml(
            printWarning.previewLines,
            printWarning.ticketNumber,
            printWarning.plate
          )}
          onReprint={() => void reprintTicket()}
          onClose={() => {
            setPrintWarning(null);
            setActive(null);
            setTicketNumber("");
            setPlate("");
            setAgreementCode("");
            setTimeout(() => {
              ticketInputRef.current?.focus();
            }, 100);
          }}
          reprintLoading={reprintLoading}

        />
      ) : null}
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
              
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleLookupClick();
                }
              }}
              endContent={
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                  Enter
                </span>
              }
            />
            <div className="space-y-1">
              <Input
                label="Placa"
                
                value={plate}
                onChange={(val) => setPlate(val.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleLookupClick();
                  }
                }}
                endContent={
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                    Placa
                  </span>
                }
              />
              {plate.startsWith("NP-") && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  Esta placa corresponde a un ingreso sin placa. Use el número de ticket para buscar.
                </p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Input
              label="Código de convenio (opcional)"
              placeholder="CONV-123"
              
              value={agreementCode}
              onChange={(e) => setAgreementCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleLookupClick();
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
              onPress={handleLookupClick}
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
                    {active.receipt.plate?.startsWith("NP-") ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-semibold">SIN PLACA</span>
                        <span className="text-sm text-slate-500">(Ingreso sin placa — busque por ticket)</span>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 font-medium">Placa: {active.receipt.plate}</p>
                    )}
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

                {/* Custodied items alert */}
                {enableCustodiedItem && pendingCustodiedItems.length > 0 && (
                  <div className="mt-4 bg-red-100 border border-red-400 rounded-xl p-4 shadow-sm animate-pulse">
                    <div className="flex items-start gap-2">
                      <svg className="w-6 h-6 text-red-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm">
                        <p className="font-bold text-red-900 text-lg uppercase">¡ATENCIÓN! Elementos custodiados</p>
                        {pendingCustodiedItems.map((item) => (
                          <div key={item.id} className="mt-2 flex items-start gap-2">
                            <input
                              type="checkbox"
                              aria-label={`Confirmar devolución de ${item.itemType === "HELMET" ? "Casco" : item.itemType}${item.identifier ? ` #${item.identifier}` : ""}`}
                              checked={returnConfirmedIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setReturnConfirmedIds((prev) => [...prev, item.id]);
                                } else {
                                  setReturnConfirmedIds((prev) => prev.filter((id) => id !== item.id));
                                }
                              }}
                              className="mt-1 rounded border-red-300"
                            />
                            <div>
                              <p className="font-bold text-red-900">
                                {item.itemType === "HELMET" ? "Casco" : item.itemType} {item.identifier ? `— #${item.identifier}` : ""}
                              </p>
                              {item.observations && <p className="text-xs text-red-700 italic font-semibold">{item.observations}</p>}
                              <p className="text-red-600 text-xs">Recibido por {item.receivedByName ?? "N/A"} — {item.receivedAt ? new Date(item.receivedAt).toLocaleString("es-CO") : ""}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {enableVehicleCondition && (
                <div className="mt-4">
                  <TextArea
                    label="Estado del vehículo"
                    placeholder="Sin novedades a la salida..."
                    
                    value={vehicleCondition}
                    onChange={(e) => setVehicleCondition(e.target.value)}
                  />
                </div>
              )}
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

          {/* Botones de cobro grandes */}
          <div className="mt-4 space-y-3">
            {hasPaymentMethod("CASH") && (
              <button
                type="button"
                data-testid="payment-cash"
                disabled={!active || searching || processing}
                onClick={() => processExit("CASH")}
                className={`
                  w-full rounded-xl px-4 py-4 text-left font-semibold transition-all
                  flex items-center gap-3
                  ${active && !processing
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white border border-default-200 -500/30" 
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"}
                `}
              >
                <div className={`
                  w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-bold text-base sm:text-lg
                  ${active && !processing ? "bg-white/20" : "bg-slate-300"}
                `}>
                  1
                </div>
                <div className="flex-1">
                  <div className="text-lg">Efectivo</div>
                  <div className="text-xs opacity-80 font-normal">Tecla 1</div>
                </div>
                {processing && (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
              </button>
            )}

            {(hasPaymentMethod("CARD") || hasPaymentMethod("DEBIT_CARD") || hasPaymentMethod("CREDIT_CARD")) && (
              <button
                type="button"
                data-testid="payment-card"
                disabled={!active || searching || processing}
                onClick={() => processExit("DEBIT_CARD")}
                className={`
                  w-full rounded-xl px-4 py-4 text-left font-semibold transition-all
                  flex items-center gap-3
                  ${active && !processing
                    ? "bg-blue-500 hover:bg-blue-600 text-white border border-default-200 -500/30" 
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"}
                `}
              >
                <div className={`
                  w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-bold text-base sm:text-lg
                  ${active && !processing ? "bg-white/20" : "bg-slate-300"}
                `}>
                  2
                </div>
                <div className="flex-1">
                  <div className="text-lg">Tarjeta</div>
                  <div className="text-xs opacity-80 font-normal">Tecla 2</div>
                </div>
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            {PAYMENT_METHODS.filter(m => hasPaymentMethod(m.code) || m.code === "MIXED").map((method, index) => (
              <Button
                key={method.code}
                className={`min-h-14 justify-start text-left font-bold ${
                  active && !processing
                    ? `${method.tone} text-white border border-default-200`
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
            <div className="mt-5 rounded-xl border border-emerald-200/80 bg-emerald-50/90 dark:border-emerald-800/50 dark:bg-emerald-950/30 p-3 space-y-3">
              <Input
                label="Recibido en efectivo"
                
                type="number"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder={String(totalDue)}
              />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-white dark:bg-neutral-950 p-3 border border-emerald-200/80 dark:border-emerald-800/50">
                  <p className="text-xs uppercase text-slate-500 dark:text-neutral-400">Cambio</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                    ${changeDue.toLocaleString("es-CO")}
                  </p>
                </div>
                <div className="rounded-lg bg-white dark:bg-neutral-950 p-3 border border-emerald-200/80 dark:border-emerald-800/50">
                  <p className="text-xs uppercase text-slate-500 dark:text-neutral-400">Vuelto</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                    ${changeDue.toLocaleString("es-CO")}
                  </p>
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
                  variant="tertiary"
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
                    
                    value={[row.method]}
                    onChange={(keys) => {
                      const next = Array.from(keys)[0] as SplitPaymentRow["method"] | undefined;
                      if (!next) return;
                      setSplitPayments((rows) =>
                        rows.map((item) => (item.id === row.id ? { ...item, method: next } : item))
                      );
                    }}
                  >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>

                    {SPLIT_METHODS.filter(m => hasPaymentMethod(m.code)).map((method) => (
                      <ListBox.Item key={method.code} textValue="{method.label}">{method.label}</ListBox.Item>
                    ))}
                  
        </ListBox>
      </Select.Popover>
    </Select>
                  <Input
                    label="Valor"
                    size="sm"
                    
                    type="number"
                    value={row.amount}
                    onChange={(value) => setSplitPayments((rows) =>
                        rows.map((item) => (item.id === row.id ? { ...item, amount: value.target.value } : item))
                      )
                    }
                  />
                  <Button
                    size="sm"
                    variant="ghost"
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
                  ? "bg-white dark:bg-neutral-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                  : "bg-white dark:bg-neutral-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50"
              }`}>
                {Math.abs(splitTotal - totalDue) <= 0.009
                  ? "Pago dividido completo"
                  : `Falta por distribuir: $${splitRemaining.toLocaleString("es-CO")}`}
              </div>
              {splitCashReceived > totalDue ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-white dark:bg-neutral-950 p-3 border border-teal-200 dark:border-teal-800/50">
                    <p className="text-xs uppercase text-slate-500 dark:text-neutral-400">Cambio</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                      ${changeDue.toLocaleString("es-CO")}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-neutral-950 p-3 border border-teal-200 dark:border-teal-800/50">
                    <p className="text-xs uppercase text-slate-500 dark:text-neutral-400">Vuelto</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                      ${changeDue.toLocaleString("es-CO")}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <Button
            color="primary"
            size="lg"
            className="mt-5 h-14 w-full font-bold border border-default-200"
            isDisabled={!active || searching || processing || !!printWarning}
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
          <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
            <input
              value={reprintReason}
              aria-label="Motivo de reimpresión"
              onChange={(event) => setReprintReason(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Motivo reimpresion"
            />
            <Button
              type="button"
              disabled={!active || searching || processing}
              onClick={reprintTicket}
              variant="ghost"
              data-testid="reprint-ticket"
            >
              Reimprimir ticket
            </Button>
            
            <input
              value={lostReason}
              aria-label="Motivo de ticket perdido"
              onChange={(event) => setLostReason(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Motivo ticket perdido"
            />
            <Button
              type="button"
              disabled={!active || searching || processing}
              onClick={lostTicket}
              variant="ghost"
              data-testid="lost-ticket"
            >
              Procesar ticket perdido
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
