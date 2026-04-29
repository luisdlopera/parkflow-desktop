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
import { useOperationSounds } from "@/lib/hooks/useOperationSounds";
import { useToast } from "@/lib/toast/ToastContext";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { CrashRecoveryDialog } from "@/components/ui/CrashRecoveryDialog";
import type { VehicleType } from "@parkflow/types";

// #region agent log - Performance logging utility
function writePerfLog(operation: string, durationMs: number, details?: Record<string, unknown>) {
  const logEntry = {
    sessionId: "0dd35a",
    timestamp: Date.now(),
    location: `VehicleEntryFormV2:${operation}`,
    message: "performance",
    data: { operation, durationMs, ...details }
  };
  const logs = JSON.parse(localStorage.getItem("perf_logs_0dd35a") || "[]");
  logs.push(logEntry);
  localStorage.setItem("perf_logs_0dd35a", JSON.stringify(logs.slice(-100)));
  console.log("[PERF_METRIC]", logEntry);
}
// #endregion

type OperatorMode = "beginner" | "expert" | "speed";

interface OperatorSettings {
  mode: OperatorMode;
  defaultVehicleType: VehicleType;
  rememberLocation: boolean;
  skipConditionCheck: boolean;
  platePrefix: string;
}

const VEHICLE_TYPE_CONFIG: Record<VehicleType, { label: string; color: string; icon: string }> = {
  CAR: { label: "Carro", color: "bg-blue-500", icon: "🚗" },
  MOTORCYCLE: { label: "Moto", color: "bg-emerald-500", icon: "🏍️" },
  VAN: { label: "Van", color: "bg-purple-500", icon: "🚐" },
  TRUCK: { label: "Camión", color: "bg-orange-500", icon: "🚛" },
  OTHER: { label: "Otro", color: "bg-slate-500", icon: "🚙" }
};

export default function VehicleEntryFormV2() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewLines, setPreviewLines] = useState<string[] | null>(null);
  const [stats, setStats] = useState({ today: 0, session: 0 });
  const [showRecovery, setShowRecovery] = useState(false);
  const submitLock = useRef(false);
  const plateInputRef = useRef<HTMLInputElement>(null);
  const { playSuccess, playError } = useOperationSounds();
  const { success: toastSuccess, error: toastError } = useToast();

  // Modo experto con persistencia
  const [settings, setSettings] = useState<OperatorSettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("parkflow_operator_settings");
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return {
      mode: "beginner",
      defaultVehicleType: "CAR",
      rememberLocation: true,
      skipConditionCheck: false,
      platePrefix: ""
    };
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const form = useForm<VehicleEntryFormValues>({
    resolver: zodResolver(vehicleEntrySchema),
    defaultValues: {
      plate: "",
      type: settings.defaultVehicleType,
      rateId: "",
      site: "Principal",
      lane: "",
      booth: "",
      terminal: "",
      observations: "",
      vehicleCondition: settings.skipConditionCheck ? "" : "Sin novedades al ingreso",
      conditionChecklist: "",
      conditionPhotoUrls: ""
    }
  });

  // Auto-save form data
  const formValues = form.watch();
  const { clearAutoSave } = useAutoSave({
    key: "entry_form",
    data: formValues,
    interval: 2000,
    enabled: formValues.plate.length > 0
  });

  // Persistir settings
  useEffect(() => {
    localStorage.setItem("parkflow_operator_settings", JSON.stringify(settings));
  }, [settings]);

  // Auto-focus en campo de placa al cargar
  useEffect(() => {
    const timer = setTimeout(() => {
      plateInputRef.current?.focus();
      plateInputRef.current?.select();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Actualizar stats desde localStorage
  useEffect(() => {
    const today = localStorage.getItem("parkflow_entries_today") || "0";
    const session = localStorage.getItem("parkflow_entries_session") || "0";
    setStats({ today: parseInt(today), session: parseInt(session) });
  }, []);

  // Re-focus después de éxito
  const focusPlate = useCallback(() => {
    setTimeout(() => {
      plateInputRef.current?.focus();
      plateInputRef.current?.select();
    }, 100);
  }, []);

  const incrementStats = useCallback(() => {
    const today = parseInt(localStorage.getItem("parkflow_entries_today") || "0") + 1;
    const session = parseInt(localStorage.getItem("parkflow_entries_session") || "0") + 1;
    localStorage.setItem("parkflow_entries_today", today.toString());
    localStorage.setItem("parkflow_entries_session", session.toString());
    setStats({ today, session });
  }, []);

  function isNetworkError(error: unknown): boolean {
    if (error instanceof TypeError) return true;
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      return msg.includes("network") || msg.includes("fetch") || msg.includes("connection") || msg.includes("offline");
    }
    return false;
  }

  const onSubmit = async (values: VehicleEntryFormValues) => {
    const startTime = performance.now();

    if (submitLock.current) return;
    submitLock.current = true;
    setMessage("");
    setError("");
    setPreviewLines(null);
    
    // Limpiar auto-save antes de enviar
    clearAutoSave();

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1/operations";
      const normalizedPlate = values.plate.trim().toUpperCase();

      const response = await fetch(`${apiBase}/entries`, {
        method: "POST",
        headers: await buildApiHeaders(),
        body: JSON.stringify({
          idempotencyKey: newIdempotencyKey(),
          ...values,
          plate: normalizedPlate,
          rateId: values.rateId?.trim() ? values.rateId.trim() : null,
          site: values.site?.trim() || null,
          lane: values.lane?.trim() || null,
          booth: values.booth?.trim() || null,
          terminal: values.terminal?.trim() || null,
          observations: values.observations?.trim() || null,
          vehicleCondition: settings.skipConditionCheck && !values.vehicleCondition?.trim() 
            ? "Sin novedades" 
            : values.vehicleCondition.trim(),
          conditionChecklist: values.conditionChecklist.split(",").map(i => i.trim()).filter(Boolean),
          conditionPhotoUrls: values.conditionPhotoUrls.split(",").map(i => i.trim()).filter(Boolean)
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? `Error del servidor (${response.status})`);
        playError();
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
        printWarning = printError instanceof Error 
          ? `No se pudo imprimir: ${printError.message}` 
          : "No se pudo imprimir";
      }

      // Toast de éxito global
      toastSuccess(
        `Ingreso registrado - Ticket: ${payload.receipt.ticketNumber}${printWarning ? `. ${printWarning}` : ""}`,
        5000
      );
      
      playSuccess();
      incrementStats();

      const durationMs = Math.round(performance.now() - startTime);
      writePerfLog("entrySubmit", durationMs, {
        ticketNumber: payload.receipt.ticketNumber,
        plate: values.plate,
        hasPrintWarning: !!printWarning,
        mode: settings.mode
      });

      // Reset form manteniendo configuración
      form.reset({
        plate: "",
        type: settings.defaultVehicleType,
        rateId: "",
        site: settings.rememberLocation ? values.site : "Principal",
        lane: settings.rememberLocation ? values.lane : "",
        booth: settings.rememberLocation ? values.booth : "",
        terminal: settings.rememberLocation ? values.terminal : "",
        observations: "",
        vehicleCondition: settings.skipConditionCheck ? "" : "Sin novedades al ingreso",
        conditionChecklist: "",
        conditionPhotoUrls: ""
      });

      focusPlate();
    } catch (err) {
      playError();
      if (isNetworkError(err)) {
        const queued = await queueOfflineOperation("ENTRY_RECORDED", {
          plate: form.getValues("plate"),
          type: form.getValues("type"),
          occurredAtIso: new Date().toISOString(),
          origin: "OFFLINE_PENDING_SYNC"
        });
        if (queued) {
          toastSuccess("Sin internet: ingreso guardado en cola offline. Será sincronizado automáticamente.");
          incrementStats();
          playSuccess();
          form.reset({ plate: "", type: settings.defaultVehicleType });
          focusPlate();
        } else {
          toastError("Sin conexión: no se pudo guardar localmente. Verifique la configuración offline.");
        }
      } else {
        console.error("Error during entry:", err);
        const errorMsg = err instanceof Error ? err.message : "Error inesperado";
        setError(errorMsg);
        toastError(errorMsg);
      }
    } finally {
      submitLock.current = false;
    }
  };

  const isExpert = settings.mode === "expert" || settings.mode === "speed";
  const isSpeed = settings.mode === "speed";

  return (
    <div className="space-y-4">
      {/* Crash Recovery Dialog */}
      <CrashRecoveryDialog
        formKey="entry_form"
        onRestore={(data) => {
          // Type assertion para los datos recuperados
          const recovered = data as VehicleEntryFormValues;
          form.reset(recovered);
          toastSuccess("Datos recuperados correctamente");
          setShowRecovery(true);
        }}
        onDismiss={() => setShowRecovery(false)}
      />

      {/* Header con stats y modo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-brand-50 rounded-xl px-3 py-2">
            <span className="text-xs text-brand-600 font-medium">Hoy: {stats.today}</span>
          </div>
          <div className="bg-slate-100 rounded-xl px-3 py-2">
            <span className="text-xs text-slate-600 font-medium">Sesión: {stats.session}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Modo:</span>
          <select
            value={settings.mode}
            onChange={(e) => setSettings(s => ({ ...s, mode: e.target.value as OperatorMode }))}
            className="text-xs font-medium bg-slate-100 rounded-lg px-2 py-1 border-0"
          >
            <option value="beginner">Principiante</option>
            <option value="expert">Experto</option>
            <option value="speed">Velocidad</option>
          </select>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
            title="Configuración"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Panel de configuración */}
      {showSettings && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">Configuración de Operador</h4>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.rememberLocation}
                onChange={(e) => setSettings(s => ({ ...s, rememberLocation: e.target.checked }))}
                className="rounded border-slate-300"
              />
              Recordar ubicación
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.skipConditionCheck}
                onChange={(e) => setSettings(s => ({ ...s, skipConditionCheck: e.target.checked }))}
                className="rounded border-slate-300"
              />
              Omitir estado vehículo
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Tipo por defecto:</label>
            <select
              value={settings.defaultVehicleType}
              onChange={(e) => setSettings(s => ({ ...s, defaultVehicleType: e.target.value as VehicleType }))}
              className="text-sm rounded-lg border-slate-200 px-2 py-1"
            >
              {Object.entries(VEHICLE_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.icon} {config.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Formulario Principal */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="surface rounded-2xl p-6 space-y-4">
        {/* Sección Principal - Siempre visible */}
        <div className="space-y-4">
          {/* Placa */}
          <div>
            <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
              Placa
              {settings.platePrefix && (
                <span className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                  Prefijo: {settings.platePrefix}
                </span>
              )}
            </label>
            <div className="relative mt-2">
              <input
                {...form.register("plate")}
                ref={(e) => {
                  form.register("plate").ref(e);
                  (plateInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                }}
                className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-2xl font-bold uppercase tracking-wider text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
                placeholder="ABC123"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isSpeed) {
                    e.preventDefault();
                    form.handleSubmit(onSubmit)();
                  }
                }}
              />
              {isSpeed && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
              Enter = Guardar
            </span>
              )}
            </div>
            {form.formState.errors.plate && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{form.formState.errors.plate.message}</p>
            )}
          </div>

          {/* Tipo de Vehículo - Botones rápidos en modo experto */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Tipo de Vehículo</label>
            {isExpert ? (
              // Modo experto: Botones grandes
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(Object.keys(VEHICLE_TYPE_CONFIG) as VehicleType[]).map((type, index) => {
                  const config = VEHICLE_TYPE_CONFIG[type];
                  const isSelected = form.watch("type") === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => form.setValue("type", type)}
                      className={`
                        relative rounded-xl p-3 text-center transition-all
                        ${isSelected 
                          ? `${config.color} text-white shadow-lg scale-105` 
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"}
                      `}
                    >
                      <div className="text-2xl mb-1">{config.icon}</div>
                      <div className="text-xs font-medium">{config.label}</div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-bold text-slate-400 shadow">
                        {index + 1}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              // Modo principiante: Select tradicional
              <select
                {...form.register("type")}
                className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none"
              >
                {Object.entries(VEHICLE_TYPE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.icon} {config.label}</option>
                ))}
              </select>
            )}
          </div>

          {/* Botón principal - Destacado en modo velocidad */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className={`
                w-full rounded-2xl font-bold transition-all flex items-center justify-center gap-2
                ${isSpeed 
                  ? "bg-brand-500 hover:bg-brand-600 text-white py-5 text-lg shadow-xl shadow-brand-500/30" 
                  : "bg-slate-900 hover:bg-slate-800 text-white py-4 text-base"}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {form.formState.isSubmitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {isSpeed ? "REGISTRAR INGRESO (Enter)" : "Registrar Ingreso"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sección Avanzada - Colapsable */}
        {!isSpeed && (
          <div className="border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {showAdvanced ? "Ocultar opciones avanzadas" : "Mostrar opciones avanzadas"}
              {!showAdvanced && (
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                  Ubicación, tarifa, observaciones
                </span>
              )}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                {/* Ubicación */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Sede</label>
                    <input
                      {...form.register("site")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Principal"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Carril</label>
                    <input
                      {...form.register("lane")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Caja</label>
                    <input
                      {...form.register("booth")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Caja 1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Terminal</label>
                    <input
                      {...form.register("terminal")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      placeholder="T1"
                    />
                  </div>
                </div>

                {/* Tarifa */}
                <div>
                  <label className="text-xs font-medium text-slate-600">Tarifa (opcional)</label>
                  <input
                    {...form.register("rateId")}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="ID de tarifa específica"
                  />
                </div>

                {/* Estado del vehículo - Solo en modo principiante o si se activa */}
                {!settings.skipConditionCheck && (
                  <div>
                    <label className="text-xs font-medium text-slate-600">Estado del vehículo</label>
                    <textarea
                      {...form.register("vehicleCondition")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      rows={2}
                      placeholder="Sin novedades al ingreso"
                    />
                  </div>
                )}

                {/* Observaciones */}
                <div>
                  <label className="text-xs font-medium text-slate-600">Observaciones</label>
                  <textarea
                    {...form.register("observations")}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Notas adicionales"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mensajes */}
        {message && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {message}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 rounded-xl px-4 py-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Preview del ticket */}
        {previewLines && (
          <TicketReceiptPreview lines={previewLines} paperWidthMm={resolvePaperWidthMm()} />
        )}
      </form>

      {/* Tips según modo */}
      <div className="bg-brand-50/50 rounded-xl p-4 text-sm">
        <p className="font-semibold text-brand-800 mb-1">
          💡 Modo {settings.mode === "beginner" ? "Principiante" : settings.mode === "expert" ? "Experto" : "Velocidad"}
        </p>
        <p className="text-brand-700">
          {settings.mode === "beginner" && "Todos los campos disponibles. Use este modo mientras aprende el sistema."}
          {settings.mode === "expert" && "Campos avanzados colapsados. Use botones rápidos para tipo de vehículo. Acceso rápido con teclas 1-5."}
          {settings.mode === "speed" && "Máxima velocidad: Solo placa es obligatoria. Presione Enter para guardar inmediatamente. Tipo por defecto: " + VEHICLE_TYPE_CONFIG[settings.defaultVehicleType].label}
        </p>
      </div>
    </div>
  );
}
