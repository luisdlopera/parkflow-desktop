"use client";

import { useMemo, useRef, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import TicketReceiptPreview from "@/components/tickets/TicketReceiptPreview";
import { buildApiHeaders } from "@/lib/api";
import {
  buildTicketPreviewForOperation,
  printReceiptIfTauri,
  resolvePaperWidthMm,
  type OperationPayload
} from "@/lib/tauri-print";
import type { VehicleType } from "@parkflow/types";

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
  const [operatorUserId, setOperatorUserId] = useState(
    process.env.NEXT_PUBLIC_DEFAULT_OPERATOR_USER_ID ?? "00000000-0000-0000-0000-000000000002"
  );
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

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1/operations",
    []
  );

  const lookup = async () => {
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
        headers: buildApiHeaders()
      });
      const payload = await response.json();
      if (!response.ok) {
        setActive(null);
        setError(payload.error ?? "No se encontro sesion activa");
        return;
      }
      setActive(payload);
    } catch {
      setError("Error de red buscando sesion");
    } finally {
      setSearching(false);
    }
  };

  const processExit = async (paymentMethod: "CASH" | "CARD") => {
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
      const response = await fetch(`${apiBase}/exits`, {
        method: "POST",
        headers: buildApiHeaders(),
        body: JSON.stringify({
          ticketNumber: active.receipt.ticketNumber,
          operatorUserId,
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
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "No se pudo registrar la salida");
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
      setMessage(
        `Salida registrada. Total: $ ${Number(payload.total ?? 0).toLocaleString("es-CO")}${
          printWarning ? `. ${printWarning}` : ""
        }`
      );
      setActive(null);
      setTicketNumber("");
      setPlate("");
    } catch {
      setError("Error de red procesando salida");
    } finally {
      setProcessing(false);
      operationLock.current = false;
    }
  };

  const reprintTicket = async () => {
    if (!active) return;
    setPreviewLines(null);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${apiBase}/tickets/reprint`, {
        method: "POST",
        headers: buildApiHeaders(),
        body: JSON.stringify({
          ticketNumber: active.receipt.ticketNumber,
          operatorUserId,
          reason: reprintReason
        })
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
      setMessage(
        `Ticket reimpreso (${payload.receipt.ticketNumber})${printWarning ? `. ${printWarning}` : ""}`
      );
      setActive(payload);
    } catch {
      setError("Error de red en reimpresion");
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
      const response = await fetch(`${apiBase}/tickets/lost`, {
        method: "POST",
        headers: buildApiHeaders(),
        body: JSON.stringify({
          ticketNumber: active.receipt.ticketNumber,
          operatorUserId,
          reason: lostReason,
          paymentMethod: "CASH"
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "No se pudo procesar ticket perdido");
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
      setMessage(
        `Ticket perdido procesado. Total: $ ${Number(payload.total ?? 0).toLocaleString("es-CO")}${
          printWarning ? `. ${printWarning}` : ""
        }`
      );
      setActive(null);
    } catch {
      setError("Error de red procesando ticket perdido");
    } finally {
      setProcessing(false);
      operationLock.current = false;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">
          Salida y cobro
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">Finalizar servicio</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="surface rounded-2xl p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Resumen rapido</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              value={operatorUserId}
              onChange={(event) => setOperatorUserId(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Operador UUID"
            />
            <input
              value={ticketNumber}
              onChange={(event) => setTicketNumber(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Ticket (ej: T-20260410-000001)"
            />
            <input
              value={plate}
              onChange={(event) => setPlate(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase"
              placeholder="Placa (ej: ABC123)"
            />
          </div>
          <div className="mt-3 grid gap-3">
            <textarea
              value={vehicleCondition}
              onChange={(event) => setVehicleCondition(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              placeholder="Estado del vehiculo a la salida"
            />
            <input
              value={conditionChecklist}
              onChange={(event) => setConditionChecklist(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Checklist salida (coma separada)"
            />
            <input
              value={conditionPhotoUrls}
              onChange={(event) => setConditionPhotoUrls(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Fotos salida (URLs separadas por coma)"
            />
          </div>
          <div className="mt-3">
            <Button
              type="button"
              onClick={lookup}
              disabled={searching || processing}
              label={searching ? "Buscando..." : "Buscar sesion"}
              tone="ghost"
            />
          </div>

          {active ? (
            <>
              <div className="mt-4 flex items-center gap-3">
                <Badge label="Activo" tone="warning" />
                <p className="text-sm text-slate-600">Sesion con placa {active.receipt.plate}</p>
              </div>
              <div className="mt-6 grid gap-3 text-sm text-slate-600">
                <p>Ticket: {active.receipt.ticketNumber}</p>
                <p>Tiempo total: {active.receipt.duration}</p>
                <p>Tarifa aplicada: {active.receipt.rateName ?? "Sin tarifa"}</p>
                <p>
                  Total estimado: $ {Number(active.total ?? active.receipt.totalAmount ?? 0).toLocaleString("es-CO")}
                </p>
                <p>Reimpresiones: {active.receipt.reprintCount}</p>
              </div>
            </>
          ) : null}

          {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
          {previewLines ? (
            <TicketReceiptPreview lines={previewLines} paperWidthMm={resolvePaperWidthMm()} />
          ) : null}
        </div>
        <div className="surface rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900">Cobro</h2>
          <p className="mt-2 text-sm text-slate-600">Selecciona metodo y confirma.</p>
          <div className="mt-4 space-y-3">
            <input
              value={reprintReason}
              onChange={(event) => setReprintReason(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Motivo reimpresion"
            />
            <input
              value={lostReason}
              onChange={(event) => setLostReason(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Motivo ticket perdido"
            />
          </div>
          <div className="mt-6 space-y-3">
            <Button
              type="button"
              disabled={!active || searching || processing}
              onClick={() => processExit("CASH")}
              label={processing ? "Procesando..." : "Cobrar en efectivo"}
              tone="primary"
            />
            <Button
              type="button"
              disabled={!active || searching || processing}
              onClick={() => processExit("CARD")}
              label="Cobrar con tarjeta"
              tone="ghost"
            />
            <Button
              type="button"
              disabled={!active || searching || processing}
              onClick={reprintTicket}
              label="Reimprimir ticket"
              tone="ghost"
            />
            <Button
              type="button"
              disabled={!active || searching || processing}
              onClick={lostTicket}
              label="Procesar ticket perdido"
              tone="ghost"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
