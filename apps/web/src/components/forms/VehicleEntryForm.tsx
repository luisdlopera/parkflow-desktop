"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
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

// Vehicle type options for select
const vehicleTypeOptions = [
  { key: "CAR", label: "Carro" },
  { key: "MOTORCYCLE", label: "Moto" },
  { key: "VAN", label: "Van" },
  { key: "TRUCK", label: "Camión" },
  { key: "OTHER", label: "Otro" },
];

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
        process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:6011/api/v1/operations";

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
    <form onSubmit={form.handleSubmit(onSubmit)} className="surface space-y-4 rounded-2xl p-4 sm:p-6">
      {/* Success Toast */}
      {showSuccess && (
        <SuccessToast 
          ticketNumber={lastTicketNumber}
          onClose={() => setShowSuccess(false)}
        />
      )}

      <Controller
        name="plate"
        control={form.control}
        render={({ field, fieldState }) => (
          <Input
            {...field}
            ref={(e: HTMLInputElement | null) => {
              field.ref(e);
              (plateInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
            }}
            label="Placa"
            placeholder="ABC123"
            variant="flat"
            isInvalid={!!fieldState.error}
            errorMessage={fieldState.error?.message}
            classNames={{
              input: "uppercase tracking-wider font-semibold",
            }}
            autoFocus
            onKeyDown={(e) => {
              // Enter en placa mueve a tipo vehículo
              if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("vehicle-type-select")?.focus();
              }
            }}
          />
        )}
      />

      <Controller
        name="type"
        control={form.control}
        render={({ field, fieldState }) => (
          <Select
            id="vehicle-type-select"
            label="Tipo"
            placeholder="Seleccionar tipo"
            variant="flat"
            selectedKeys={field.value ? [field.value] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string;
              field.onChange(selected);
            }}
            isInvalid={!!fieldState.error}
            errorMessage={fieldState.error?.message}
            onKeyDown={(e) => {
              // Enter en tipo envía formulario directamente
              if (e.key === "Enter") {
                e.preventDefault();
                form.handleSubmit(onSubmit)();
              }
            }}
          >
            {vehicleTypeOptions.map((option) => (
              <SelectItem key={option.key}>{option.label}</SelectItem>
            ))}
          </Select>
        )}
      />

      <Controller
        name="rateId"
        control={form.control}
        render={({ field }) => (
          <Input
            {...field}
            label="Tarifa"
            placeholder="Tarifa por defecto"
            variant="flat"
          />
        )}
      />

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        <Controller
          name="site"
          control={form.control}
          render={({ field }) => (
            <Input
              {...field}
              label="Sede"
              placeholder="Principal"
              variant="flat"
            />
          )}
        />
        <Controller
          name="lane"
          control={form.control}
          render={({ field }) => (
            <Input
              {...field}
              label="Carril"
              placeholder="1"
              variant="flat"
            />
          )}
        />
        <Controller
          name="booth"
          control={form.control}
          render={({ field }) => (
            <Input
              {...field}
              label="Caja"
              placeholder="Caja 1"
              variant="flat"
            />
          )}
        />
        <Controller
          name="terminal"
          control={form.control}
          render={({ field }) => (
            <Input
              {...field}
              label="Terminal"
              placeholder="T1"
              variant="flat"
            />
          )}
        />
      </div>

      <Controller
        name="vehicleCondition"
        control={form.control}
        render={({ field, fieldState }) => (
          <Input
            {...field}
            label="Estado del vehículo"
            placeholder="Sin novedades al ingreso"
            variant="flat"
            isInvalid={!!fieldState.error}
            errorMessage={fieldState.error?.message}
          />
        )}
      />

      <Controller
        name="conditionChecklist"
        control={form.control}
        render={({ field }) => (
          <Input
            {...field}
            label="Checklist (separado por comas)"
            placeholder="luces ok, espejo derecho ok"
            variant="flat"
          />
        )}
      />

      <Controller
        name="conditionPhotoUrls"
        control={form.control}
        render={({ field }) => (
          <Input
            {...field}
            label="Fotos (URLs separadas por comas)"
            placeholder="https://.../foto1.jpg,https://.../foto2.jpg"
            variant="flat"
          />
        )}
      />

      <Controller
        name="observations"
        control={form.control}
        render={({ field }) => (
          <Input
            {...field}
            label="Observaciones"
            placeholder="Notas adicionales"
            variant="flat"
          />
        )}
      />

      <div className="pt-2">
        <Button
          type="submit"
          color="primary"
          isLoading={form.formState.isSubmitting}
          className="w-full"
        >
          {form.formState.isSubmitting ? "Registrando..." : "Registrar ingreso"}
        </Button>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {previewLines ? (
        <TicketReceiptPreview lines={previewLines} paperWidthMm={resolvePaperWidthMm()} />
      ) : null}
    </form>
  );
}
