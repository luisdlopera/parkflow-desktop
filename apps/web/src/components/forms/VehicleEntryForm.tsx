"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@/components/ui/Button";
import TicketReceiptPreview from "@/components/tickets/TicketReceiptPreview";
import { vehicleEntrySchema, VehicleEntryFormValues } from "@/modules/parking/vehicle.schema";
import { buildApiHeaders } from "@/lib/api";
import { newIdempotencyKey } from "@/lib/idempotency";
import { queueOfflineOperation } from "@/lib/offline-outbox";
import {
  buildTicketPreviewForOperation,
  printReceiptIfTauri,
  resolvePaperWidthMm
} from "@/lib/tauri-print";
import type { VehicleType } from "@parkflow/types";
import { useOperationSounds } from "@/lib/hooks/useOperationSounds";
import { SuccessToast } from "@/components/ui/Toast";

// #region agent log - Performance logging utility
function writePerfLog(operation: string, durationMs: number, details?: Record<string, unknown>) {
  const logEntry = {
    sessionId: "0dd35a",
    timestamp: Date.now(),
    location: `VehicleEntryForm:${operation}`,
    message: "performance",
    data: { operation, durationMs, ...details }
  };
  // Write to localStorage for persistence, console for immediate visibility
  const logs = JSON.parse(localStorage.getItem("perf_logs_0dd35a") || "[]");
  logs.push(logEntry);
  localStorage.setItem("perf_logs_0dd35a", JSON.stringify(logs.slice(-100))); // Keep last 100
  console.log("[PERF_METRIC]", logEntry);
}
// #endregion

export default function VehicleEntryForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewLines, setPreviewLines] = useState<string[] | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastTicketNumber, setLastTicketNumber] = useState("");
  const submitLock = useRef(false);
  const plateInputRef = useRef<HTMLInputElement>(null);
  const { playSuccess, playError } = useOperationSounds();

  const form = useForm<VehicleEntryFormValues>({
    resolver: zodResolver(vehicleEntrySchema),
    defaultValues: {
      plate: "",
      type: "CAR",
      rateId: "",
      site: "Principal",
      lane: "",
      booth: "",
      terminal: "",
      observations: "",
      vehicleCondition: "Sin novedades al ingreso",
      conditionChecklist: "",
      conditionPhotoUrls: ""
    }
  });

  // Auto-focus en campo de placa al cargar
  useEffect(() => {
    const timer = setTimeout(() => {
      plateInputRef.current?.focus();
      plateInputRef.current?.select();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Re-focus después de éxito para siguiente operación
  const focusPlate = useCallback(() => {
    setTimeout(() => {
      plateInputRef.current?.focus();
      plateInputRef.current?.select();
    }, 100);
  }, []);

  // Type guard to identify network errors vs HTTP errors
  function isNetworkError(error: unknown): boolean {
    if (error instanceof TypeError) {
      // fetch throws TypeError for network failures (offline, DNS, connection refused)
      return true;
    }
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      return msg.includes("network") || 
             msg.includes("fetch") || 
             msg.includes("connection") ||
             msg.includes("offline");
    }
    return false;
  }

  const onSubmit = async (values: VehicleEntryFormValues) => {
    // #region agent log - Performance instrumentation
    const startTime = performance.now();
    // #endregion
    
    if (submitLock.current) {
      return;
    }
    submitLock.current = true;
    setMessage("");
    setError("");
    setPreviewLines(null);

    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1/operations";

      // SECURITY/DATA QUALITY: Normalize plate to uppercase for consistency
      const normalizedPlate = values.plate.trim().toUpperCase();
      
      const response = await fetch(`${apiBase}/entries`, {
        method: "POST",
        headers: await buildApiHeaders(),
        body: JSON.stringify({
          idempotencyKey: newIdempotencyKey(),
          ...values,
          plate: normalizedPlate,  // Normalized plate
          rateId: values.rateId?.trim() ? values.rateId.trim() : null,
          site: values.site?.trim() || null,
          lane: values.lane?.trim() || null,
          booth: values.booth?.trim() || null,
          terminal: values.terminal?.trim() || null,
          observations: values.observations?.trim() || null,
          vehicleCondition: values.vehicleCondition.trim(),
          conditionChecklist: values.conditionChecklist
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          conditionPhotoUrls: values.conditionPhotoUrls
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        // HTTP error from server - this is NOT a network/offline issue
        setError(payload.error ?? `Error del servidor (${response.status})`);
        return;
      }

      const printPayload = {
        sessionId: payload.sessionId,
        receipt: {
          ticketNumber: payload.receipt.ticketNumber,
          plate: payload.receipt.plate,
          vehicleType: payload.receipt.vehicleType as VehicleType,
          site: payload.receipt.site ?? values.site?.trim() ?? null,
          lane: payload.receipt.lane ?? values.lane?.trim() ?? null,
          booth: payload.receipt.booth ?? values.booth?.trim() ?? null,
          terminal: payload.receipt.terminal ?? values.terminal?.trim() ?? null,
          entryAt: payload.receipt.entryAt ?? null
        }
      };
      setPreviewLines(buildTicketPreviewForOperation(printPayload, "ENTRY"));

      let printWarning: string | null = null;
      try {
        printWarning = await printReceiptIfTauri(printPayload, "ENTRY");
      } catch (printError) {
        printWarning =
          printError instanceof Error
            ? `No se pudo imprimir en desktop: ${printError.message}`
            : "No se pudo imprimir en desktop.";
      }
      setLastTicketNumber(payload.receipt.ticketNumber);
      setShowSuccess(true);
      
      // Feedback sonoro de éxito
      playSuccess();
      
      const messageText = printWarning
        ? `Ingreso registrado. Ticket: ${payload.receipt.ticketNumber}. ${printWarning}`
        : `Ingreso registrado. Ticket: ${payload.receipt.ticketNumber}`;
      setMessage(messageText);
      
      // Auto-hide success toast después de 3 segundos
      setTimeout(() => setShowSuccess(false), 3000);
      
      // #region agent log - Performance instrumentation
      const durationMs = Math.round(performance.now() - startTime);
      writePerfLog("entrySubmit", durationMs, { 
        ticketNumber: payload.receipt.ticketNumber,
        plate: values.plate,
        hasPrintWarning: !!printWarning
      });
      // #endregion
      
      // Reset form manteniendo configuración de ubicación
      form.reset({
        plate: "",
        type: "CAR",
        rateId: "",
        site: values.site,
        lane: values.lane,
        booth: values.booth,
        terminal: values.terminal,
        observations: "",
        vehicleCondition: "Sin novedades al ingreso",
        conditionChecklist: "",
        conditionPhotoUrls: ""
      });
      
      // Re-focus para siguiente operación
      focusPlate();
    } catch (err) {
      // Feedback sonoro de error
      playError();
      
      // Differentiate network errors from other errors
      if (isNetworkError(err)) {
        const queued = await queueOfflineOperation("ENTRY_RECORDED", {
          plate: values.plate,
          type: values.type,
          occurredAtIso: new Date().toISOString(),
          origin: "OFFLINE_PENDING_SYNC"
        });
        if (queued) {
          setMessage("Sin internet: ingreso guardado en cola offline para sincronizacion.");
          playSuccess(); // Es éxito offline
        } else {
          setError("Sin conexion: no se pudo guardar localmente. Verifique la sesion offline.");
        }
      } else {
        // Non-network error (JSON parse, runtime error, etc.) - don't queue
        console.error("Unexpected error during entry:", err);
        setError(err instanceof Error ? err.message : "Error inesperado al registrar ingreso");
      }
    } finally {
      submitLock.current = false;
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="surface space-y-4 rounded-2xl p-6">
      {/* Success Toast */}
      {showSuccess && (
        <SuccessToast 
          ticketNumber={lastTicketNumber}
          onClose={() => setShowSuccess(false)}
        />
      )}

      <div>
        <label className="text-sm font-medium text-slate-700">Placa</label>
        <input
          {...form.register("plate")}
          ref={(e) => {
            // Merge refs: react-hook-form y nuestra ref de focus
            form.register("plate").ref(e);
            (plateInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
          }}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm uppercase tracking-wider font-semibold"
          placeholder="ABC123"
          autoFocus
          onKeyDown={(e) => {
            // Enter en placa mueve a tipo vehículo
            if (e.key === "Enter") {
              e.preventDefault();
              document.getElementById("vehicle-type-select")?.focus();
            }
          }}
        />
        {form.formState.errors.plate && (
          <p className="mt-1 text-xs text-rose-600">{form.formState.errors.plate.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Tipo</label>
        <select
          {...form.register("type")}
          id="vehicle-type-select"
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          onKeyDown={(e) => {
            // Enter en tipo envía formulario directamente
            if (e.key === "Enter") {
              e.preventDefault();
              form.handleSubmit(onSubmit)();
            }
          }}
        >
          <option value="CAR">Carro</option>
          <option value="MOTORCYCLE">Moto</option>
          <option value="VAN">Van</option>
          <option value="TRUCK">Camion</option>
          <option value="OTHER">Otro</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Tarifa</label>
        <input
          {...form.register("rateId")}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          placeholder="Tarifa por defecto"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Sede</label>
          <input
            {...form.register("site")}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            placeholder="Principal"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Carril</label>
          <input
            {...form.register("lane")}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            placeholder="1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Caja</label>
          <input
            {...form.register("booth")}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            placeholder="Caja 1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Terminal</label>
          <input
            {...form.register("terminal")}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            placeholder="T1"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Estado del vehiculo</label>
        <textarea
          {...form.register("vehicleCondition")}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          rows={3}
          placeholder="Sin rayones, casco en baul"
        />
        {form.formState.errors.vehicleCondition && (
          <p className="mt-1 text-xs text-rose-600">{form.formState.errors.vehicleCondition.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Checklist (separado por comas)</label>
        <input
          {...form.register("conditionChecklist")}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          placeholder="luces ok, espejo derecho ok"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Fotos (URLs separadas por comas)</label>
        <input
          {...form.register("conditionPhotoUrls")}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          placeholder="https://.../foto1.jpg,https://.../foto2.jpg"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Observaciones</label>
        <textarea
          {...form.register("observations")}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          rows={2}
          placeholder="Notas adicionales"
        />
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          label={form.formState.isSubmitting ? "Registrando..." : "Registrar ingreso"}
          tone="primary"
        />
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {previewLines ? (
        <TicketReceiptPreview lines={previewLines} paperWidthMm={resolvePaperWidthMm()} />
      ) : null}
    </form>
  );
}
