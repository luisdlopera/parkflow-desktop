"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import { Checkbox } from "@heroui/checkbox";
import { Card, CardBody } from "@heroui/card";
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
import { fetchMasterVehicleTypes, type MasterVehicleTypeRow } from "@/lib/settings-api";

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

const VEHICLE_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  CAR: { label: "Carro", color: "bg-blue-500", icon: "🚗" },
  MOTORCYCLE: { label: "Moto", color: "bg-emerald-500", icon: "🏍️" },
  VAN: { label: "Van", color: "bg-purple-500", icon: "🚐" },
  TRUCK: { label: "Camión", color: "bg-orange-500", icon: "🚛" },
  OTHER: { label: "Otro", color: "bg-slate-500", icon: "🚙" }
};

const modeOptions = [
  { key: "beginner", label: "Principiante" },
  { key: "expert", label: "Experto" },
  { key: "speed", label: "Velocidad" },
];

export default function VehicleEntryFormV2() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewLines, setPreviewLines] = useState<string[] | null>(null);
  const [stats, setStats] = useState({ today: 0, session: 0 });
  const [showRecovery, setShowRecovery] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<MasterVehicleTypeRow[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
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

  useEffect(() => {
    fetchMasterVehicleTypes()
      .then(types => {
        setVehicleTypes(types);
        setLoadingTypes(false);
      })
      .catch(err => {
        console.error("Error fetching vehicle types:", err);
        setLoadingTypes(false);
      });
  }, []);

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
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:6011/api/v1/operations";
      const normalizedPlate = values.plate.trim().toUpperCase().replace(/\s+/g, '');

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

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Build a fake response object to pass to normalizeApiError 
        // since we already read the body
        const fakeResponse = new Response(JSON.stringify(payload), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
        
        // Dynamic import to avoid missing imports at the top
        const { normalizeApiError } = await import("@/lib/errors/normalize-api-error");
        const { getUserErrorMessage } = await import("@/lib/errors/get-user-error-message");
        
        const apiError = await normalizeApiError(fakeResponse);
        const userError = getUserErrorMessage(apiError, "tickets.create");
        
        let errorText = userError.description;
        if (apiError.code === "VALIDATION_ERROR" && apiError.details) {
          // Si el backend manda los errores de validación, mostramos el primero
          if (Array.isArray(apiError.details) && apiError.details.length > 0) {
             errorText = apiError.details[0].message || userError.description;
          } else if (typeof apiError.details === "object" && !Array.isArray(apiError.details)) {
             const details = apiError.details as Record<string, any>;
             const firstKey = Object.keys(details)[0];
             if (firstKey) errorText = `${firstKey}: ${details[firstKey]}`;
          }
        }
        
        setError(errorText);
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

      {/* Header con stats y modo - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Stats - en móvil se muestran en fila, en desktop también */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-brand-50 rounded-xl px-3 py-2">
            <span className="text-xs text-brand-600 font-medium whitespace-nowrap">Hoy: {stats.today}</span>
          </div>
          <div className="bg-slate-100 rounded-xl px-3 py-2">
            <span className="text-xs text-slate-600 font-medium whitespace-nowrap">Sesión: {stats.session}</span>
          </div>
        </div>

        {/* Selector de modo - ocupa todo el ancho en móvil */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap">Modo:</span>
          <Select
            size="sm"
            variant="flat"
            aria-label="Modo de operación"
            selectedKeys={[settings.mode]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as OperatorMode;
              setSettings(s => ({ ...s, mode: selected }));
            }}
            className="w-28 sm:w-32"
            classNames={{
              trigger: "min-h-0 h-8",
            }}
          >
            {modeOptions.map((option) => (
              <SelectItem key={option.key} textValue={option.label}>{option.label}</SelectItem>
            ))}
          </Select>
          <Button
            isIconOnly
            size="sm"
            variant="flat"
            aria-label="Configuración de operador"
            onPress={() => setShowSettings(!showSettings)}
            className="flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Panel de configuración */}
      {showSettings && (
        <Card className="bg-slate-50">
          <CardBody className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-700">Configuración de Operador</h4>
            <div className="flex flex-wrap gap-4">
              <Checkbox
                isSelected={settings.rememberLocation}
                onValueChange={(checked) => setSettings(s => ({ ...s, rememberLocation: checked }))}
                size="sm"
              >
                Recordar ubicación
              </Checkbox>
              <Checkbox
                isSelected={settings.skipConditionCheck}
                onValueChange={(checked) => setSettings(s => ({ ...s, skipConditionCheck: checked }))}
                size="sm"
              >
                Omitir estado vehículo
              </Checkbox>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Tipo por defecto:</label>
              <Select
                size="sm"
                variant="flat"
                aria-label="Tipo de vehículo por defecto"
                selectedKeys={[settings.defaultVehicleType]}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as VehicleType;
                  setSettings(s => ({ ...s, defaultVehicleType: selected }));
                }}
                className="w-40"
              >
                {Object.entries(VEHICLE_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} textValue={config.label}>{config.icon} {config.label}</SelectItem>
                ))}
              </Select>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Formulario Principal */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="surface rounded-2xl p-6 space-y-4">
        {/* Sección Principal - Siempre visible */}
        <div className="space-y-4">
          {/* Placa */}
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
                label={
                  <span className="flex items-center justify-between w-full">
                    Placa
                    {settings.platePrefix && (
                      <span className="text-xs text-primary bg-primary-50 px-2 py-0.5 rounded">
                        Prefijo: {settings.platePrefix}
                      </span>
                    )}
                  </span>
                }
                placeholder="ABC123"
                variant="flat"
                isInvalid={!!fieldState.error}
                errorMessage={fieldState.error?.message}
                classNames={{
                  input: "text-2xl font-bold uppercase tracking-wider",
                  inputWrapper: isSpeed ? "border-2 border-primary" : "",
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isSpeed) {
                    e.preventDefault();
                    form.handleSubmit(onSubmit)();
                  }
                }}
              />
            )}
          />

          {/* Tipo de Vehículo */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Tipo de Vehículo</label>
            {loadingTypes ? (
              <div className="h-10 w-full bg-slate-100 animate-pulse rounded-lg" />
            ) : isExpert ? (
              // Modo experto: Botones grandes - responsive grid
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
                {vehicleTypes.map((t, index) => {
                  const config = VEHICLE_TYPE_CONFIG[t.code] || { label: t.name, color: "bg-slate-400", icon: "🚗" };
                  const isSelected = form.watch("type") === t.code;
                  return (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => form.setValue("type", t.code)}
                      className={`
                        relative rounded-xl p-2 sm:p-3 text-center transition-all
                        ${isSelected
                          ? `${config.color} text-white shadow-lg scale-105`
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"}
                      `}
                    >
                      <div className="text-xl sm:text-2xl mb-1">{config.icon}</div>
                      <div className="text-xs font-medium">{config.label}</div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400 shadow">
                        {index + 1}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              // Modo principiante: Select
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <Select
                    variant="flat"
                    aria-label="Tipo de vehículo"
                    selectedKeys={[field.value]}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      field.onChange(selected);
                    }}
                  >
                    {vehicleTypes.map((t) => {
                      const config = VEHICLE_TYPE_CONFIG[t.code] || { label: t.name, icon: "🚗" };
                      return (
                        <SelectItem key={t.code} textValue={config.label}>
                          {config.icon} {config.label}
                        </SelectItem>
                      );
                    })}
                  </Select>
                )}
              />
            )}
          </div>

          {/* Botón principal */}
          <div className="pt-2">
            <Button
              type="submit"
              color={isSpeed ? "primary" : "default"}
              size={isSpeed ? "lg" : "md"}
              isLoading={form.formState.isSubmitting}
              className={`w-full font-bold ${isSpeed ? "text-lg shadow-xl" : ""}`}
            >
              {form.formState.isSubmitting ? "Registrando..." : isSpeed ? "REGISTRAR INGRESO (Enter)" : "Registrar Ingreso"}
            </Button>
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
                  <Controller
                    name="site"
                    control={form.control}
                    render={({ field }) => (
                      <Input {...field} label="Sede" placeholder="Principal" variant="flat" size="sm" />
                    )}
                  />
                  <Controller
                    name="lane"
                    control={form.control}
                    render={({ field }) => (
                      <Input {...field} label="Carril" placeholder="1" variant="flat" size="sm" />
                    )}
                  />
                  <Controller
                    name="booth"
                    control={form.control}
                    render={({ field }) => (
                      <Input {...field} label="Caja" placeholder="Caja 1" variant="flat" size="sm" />
                    )}
                  />
                  <Controller
                    name="terminal"
                    control={form.control}
                    render={({ field }) => (
                      <Input {...field} label="Terminal" placeholder="T1" variant="flat" size="sm" />
                    )}
                  />
                </div>

                {/* Tarifa */}
                <Controller
                  name="rateId"
                  control={form.control}
                  render={({ field }) => (
                    <Input {...field} label="Tarifa (opcional)" placeholder="ID de tarifa específica" variant="flat" size="sm" />
                  )}
                />

                {/* Estado del vehículo */}
                {!settings.skipConditionCheck && (
                  <Controller
                    name="vehicleCondition"
                    control={form.control}
                    render={({ field }) => (
                      <Input {...field} label="Estado del vehículo" placeholder="Sin novedades al ingreso" variant="flat" size="sm" />
                    )}
                  />
                )}

                {/* Observaciones */}
                <Controller
                  name="observations"
                  control={form.control}
                  render={({ field }) => (
                    <Input {...field} label="Observaciones" placeholder="Notas adicionales" variant="flat" size="sm" />
                  )}
                />
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
