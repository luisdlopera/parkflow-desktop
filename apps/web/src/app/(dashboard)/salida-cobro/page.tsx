"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
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
  };
  total: number | null;
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
  const [reprintReason, setReprintReason] = useState("Reimpresion solicitada por cliente");
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [active, setActive] = useState<ActiveLookup | null>(null);
  const [previewLines, setPreviewLines] = useState<string[] | null>(null);
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
      playSuccess();
    } catch {
      setError("Error de red buscando sesion");
      playError();
    } finally {
      setSearching(false);
    }
  }, [ticketNumber, plate, apiBase, playSuccess, playError]);

  const processExit = useCallback(async (paymentMethod: "CASH" | "CARD") => {
    if (!active) {
      setError("Primero busca una sesion activa");
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
        vehicleCondition,
        conditionChecklist: conditionChecklist
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        conditionPhotoUrls: conditionPhotoUrls
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
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
  }, [active, apiBase, vehicleCondition, conditionChecklist, conditionPhotoUrls, playSuccess, playError, toastSuccess, toastError]);

  // Keyboard shortcuts - definido después de processExit
  useExitShortcuts({
    onCashPayment: () => processExit("CASH"),
    onCardPayment: () => processExit("CARD"),
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
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <input
                ref={ticketInputRef}
                data-testid="ticket-number"
                value={ticketNumber}
                onChange={(event) => setTicketNumber(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    lookup();
                  }
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                placeholder="Numero de ticket"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                Enter
              </span>
            </div>
            <div className="relative">
              <input
                value={plate}
                data-testid="plate"
                onChange={(event) => setPlate(event.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    lookup();
                  }
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium uppercase focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                placeholder="Placa (ABC123)"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                Placa
              </span>
            </div>
          </div>
          <div className="mt-3">
            <button
              type="button"
              data-testid="search-session"
              onClick={lookup}
              disabled={searching || processing}
              className="w-full sm:w-auto rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-6 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {searching ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Buscar sesion (Ctrl+Enter)
                </>
              )}
            </button>
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
                    ${Number(active.total ?? active.receipt.totalAmount ?? 0).toLocaleString("es-CO")}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Tiempo: {active.receipt.duration} • {active.receipt.rateName ?? "Tarifa estándar"}
                  </p>
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

              {/* Campos de condición colapsables */}
              <div className="mt-4 space-y-3">
                <textarea
                  value={vehicleCondition}
                  onChange={(event) => setVehicleCondition(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                  rows={2}
                  placeholder="Estado del vehiculo a la salida (opcional)"
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
              ? "Presione 1 para efectivo, 2 para tarjeta, o use los botones." 
              : "Busque una sesion activa para habilitar cobros."}
          </p>

          {/* Botones de cobro grandes */}
          <div className="mt-4 space-y-3">
            <button
              type="button"
              data-testid="payment-cash"
              disabled={!active || searching || processing}
              onClick={() => processExit("CASH")}
              className={`
                w-full rounded-xl px-4 py-4 text-left font-semibold transition-all
                flex items-center gap-3
                ${active && !processing
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30" 
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

            <button
              type="button"
              data-testid="payment-card"
              disabled={!active || searching || processing}
              onClick={() => processExit("CARD")}
              className={`
                w-full rounded-xl px-4 py-4 text-left font-semibold transition-all
                flex items-center gap-3
                ${active && !processing
                  ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
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
          </div>

          {/* Calculadora de cambio - Solo visible cuando hay monto */}
          {active && (
            <div className="mt-6">
              <ChangeCalculator 
                totalAmount={Number(active.total ?? active.receipt.totalAmount ?? 0)} 
              />
            </div>
          )}

          {/* Acciones secundarias */}
          <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
            <input
              value={reprintReason}
              onChange={(event) => setReprintReason(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Motivo reimpresion"
            />
            <Button
              type="button"
              disabled={!active || searching || processing}
              onClick={reprintTicket}
              label="Reimprimir ticket"
              tone="ghost"
              data-testid="reprint-ticket"
            />
            
            <input
              value={lostReason}
              onChange={(event) => setLostReason(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Motivo ticket perdido"
            />
            <Button
              type="button"
              disabled={!active || searching || processing}
              onClick={lostTicket}
              label="Procesar ticket perdido"
              tone="ghost"
              data-testid="lost-ticket"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
