"use client";
import { ListBox } from "@heroui/react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { useRef, useState, useCallback, useEffect, useMemo, type KeyboardEvent } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import TicketPrintWarning from "@/components/tickets/TicketPrintWarning";
import { vehicleEntrySchema, VehicleEntryFormValues } from "@/modules/parking/vehicle.schema";
import { buildApiHeaders } from "@/lib/api";
import { newIdempotencyKey, getOrCreateIdempotencyKey, clearIdempotencyKey } from "@/lib/idempotency";
import { queueOfflineOperation } from "@/lib/offline-outbox";
import {
  buildTicketPreviewForOperation,
  printReceiptIfTauri
} from "@/lib/tauri-print";
import { downloadTicketAsHtml } from "@/lib/print/ticket-download";
import { useOperationSounds } from "@/lib/hooks/useOperationSounds";
import { toast } from "@heroui/react";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { CrashRecoveryDialog } from "@/components/ui/CrashRecoveryDialog";
import { normalizePlate, inferVehicleType } from "@/lib/validation/plate-validator";
import type { VehicleType } from "@parkflow/types";
import { fetchMasterVehicleTypes, type MasterVehicleTypeRow } from "@/lib/settings-api";
import { currentUser } from "@/lib/auth";
import { useTenantConfig } from "@/lib/providers/TenantConfigProvider";
import { fetchParkingSpaces, type ParkingSpaceDto } from "@/services/sessions.service";
import { FormLayoutFactory } from "@/components/forms/dynamic/FormLayoutFactory";
import { type RegisteredFieldKey } from "@/components/forms/dynamic/form-registry";
import { MotorcycleEntryFormUI } from "@/components/forms/motorcycle/MotorcycleEntryFormUI";
import { CarEntryFormUI } from "@/components/forms/car/CarEntryFormUI";
import { VehicleTypeIcon } from "@/components/vehicles/VehicleTypeIcon";

const ENTRY_FORM_LAYOUT: RegisteredFieldKey[] = [
  "vehicle_condition",
  "helmet_section",
  "observations",
];
import { operationEntryRequestSchema, operationReprintRequestSchema } from "@/lib/validation/contracts";
import { validatePayloadOrThrow, toUserMessageFromClientValidation } from "@/lib/validation/request-guard";
import { normalizeApiError } from "@/lib/errors/normalize-api-error";
import { getUserErrorMessage } from "@/lib/errors/get-user-error-message";

// #region agent log - Performance logging utility
function writePerfLog(operation: string, durationMs: number, details?: Record<string, unknown>) {
  const logEntry = {
    sessionId: "0dd35a",
    timestamp: Date.now(),
    location: `VehicleEntryFormV2:${operation}`,
    message: "performance",
    data: { operation, durationMs, ...details }
  };
  let logs: unknown[] = [];
  try {
    const parsed = JSON.parse(localStorage.getItem("perf_logs_0dd35a") || "[]");
    logs = Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem("perf_logs_0dd35a");
  }
  logs.push(logEntry);
  localStorage.setItem("perf_logs_0dd35a", JSON.stringify(logs.slice(-100)));
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

function sortedActiveTypes(types: MasterVehicleTypeRow[]) {
  return types
    .filter((type) => type.isActive)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name));
}

function vehicleTypeView(type: MasterVehicleTypeRow) {
  return {
    label: type.name || type.code,
    color: type.color || ""
  };
}

const modeOptions = [
  { key: "beginner", label: "Principiante" },
  { key: "expert", label: "Experto" },
  { key: "speed", label: "Velocidad" },
];

const entryModeOptions = [
  { key: "VISITOR", label: "Visitante" },
  { key: "AGREEMENT", label: "Convenio" },
  { key: "SUBSCRIBER", label: "Abonado" },
  { key: "EMPLOYEE", label: "Empleado" },
];

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("network") || msg.includes("fetch") || msg.includes("connection") || msg.includes("offline");
  }
  return false;
}

function resolveVehicleType(type: string, countryCode: string, plate: string): VehicleType {
  if (!type || type === "CAR" || type === "OTHER") {
    const inferred = inferVehicleType(countryCode, plate);
    if (inferred) {
      return inferred as VehicleType;
    }
  }
  return type as VehicleType;
}

function extractValidationError(apiError: any, defaultDescription: string): string {
  if (apiError.code === "VALIDATION_ERROR" && apiError.details) {
    if (Array.isArray(apiError.details) && apiError.details.length > 0) {
      return apiError.details[0].message || defaultDescription;
    }
    if (typeof apiError.details === "object") {
      const details = apiError.details as Record<string, any>;
      const firstKey = Object.keys(details)[0];
      if (firstKey) {
        return `${firstKey}: ${details[firstKey]}`;
      }
    }
  }
  return defaultDescription;
}

async function handleOfflineEntry(
  plate: string,
  type: string,
  idempotencyFingerprint: string,
  playSuccess: () => void,
  toastSuccess: (msg: string) => void,
  toastError: (msg: string) => void
): Promise<boolean> {
  const queued = await queueOfflineOperation("ENTRY_RECORDED", {
    plate,
    type,
    occurredAtIso: new Date().toISOString(),
    origin: "OFFLINE_PENDING_SYNC"
  });
  if (queued) {
    clearIdempotencyKey("entry", idempotencyFingerprint);
    toastSuccess("Sin internet: ingreso guardado en cola offline. Será sincronizado automáticamente.");
    playSuccess();
    return true;
  }
  toastError("Sin conexión: no se pudo guardar localmente. Verifique la configuración offline.");
  return false;
}

function buildEntryRequestBody(
  user: any,
  values: VehicleEntryFormValues,
  settings: OperatorSettings,
  idempotencyKey: string,
  normalizedPlate: string,
  resolvedType: string
) {
  return validatePayloadOrThrow(
    operationEntryRequestSchema,
    {
      idempotencyKey,
      operatorUserId: user.id,
      ...values,
      type: resolvedType,
      plate: normalizedPlate,
      countryCode: values.countryCode,
      entryMode: values.entryMode,
      noPlate: values.noPlate,
      noPlateReason: values.noPlate ? values.noPlateReason?.trim() : null,
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
      conditionPhotoUrls: values.conditionPhotoUrls.split(",").map(i => i.trim()).filter(Boolean),
      custodiedItems: values.custodiedItems?.map(item => ({
        identifier: item.identifier.trim(),
        observations: item.observations?.trim() || null,
        photoUrl: item.photoUrl?.trim() || null
      })) || []
    },
    "Corrige los campos del ingreso antes de enviar"
  );
}

async function handleEntryPrinting(payload: any, values: VehicleEntryFormValues) {
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
      parkingSpaceCode: payload.receipt.parkingSpaceCode ?? null,
      entryAt: payload.receipt.entryAt ?? null
    }
  };
  const generatedPreviewLines = buildTicketPreviewForOperation(printPayload, "ENTRY");

  let printWarning: string | null = null;
  try {
    printWarning = await printReceiptIfTauri(printPayload, "ENTRY");
  } catch (printError) {
    printWarning = printError instanceof Error 
      ? `No se pudo imprimir: ${printError.message}` 
      : "No se pudo imprimir";
  }

  const plateLabel = payload?.receipt?.plate?.startsWith("NP-") ? "SIN PLACA" : payload?.receipt?.plate;
  return { printWarning, plateLabel, generatedPreviewLines };
}

export default function VehicleEntryFormV2({ initialPlate = "", disableRecovery = false }: { initialPlate?: string; disableRecovery?: boolean }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ today: 0, session: 0 });
  const [showRecovery, setShowRecovery] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<MasterVehicleTypeRow[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [activeLookup, setActiveLookup] = useState<string | null>(null);
  const { runtimeConfig } = useTenantConfig();
  const submitLock = useRef(false);
  const [occupancy, setOccupancy] = useState<{ availableSpaces: number; activeSpaces: number } | null>(null);
  const [spaces, setSpaces] = useState<ParkingSpaceDto[]>([]);

  const loadOccupancy = useCallback(async () => {
    try {
      const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6011/api/v1";
      const [occupancyRes, spacesData] = await Promise.all([
        fetch(`${api}/parking-spaces/summary`, { headers: await buildApiHeaders(), cache: "no-store" }),
        fetchParkingSpaces()
      ]);
      if (occupancyRes.ok) {
        const data = await occupancyRes.json();
        setOccupancy({
          availableSpaces: data.availableSpaces,
          activeSpaces: data.activeSpaces
        });
      }
      setSpaces(spacesData.filter(s => s.status === "ACTIVE" && !s.occupied));
    } catch (err) {
      console.error("Error loading occupancy and spaces:", err);
    }
  }, []);
  const plateInputRef = useRef<HTMLInputElement>(null);
  const idempotencyKeyRef = useRef(newIdempotencyKey());
  const { playSuccess, playError } = useOperationSounds();
  const toastSuccess = toast.success;
  const toastError = toast.danger;

  // Modo experto con persistencia
  const [settings, setSettings] = useState<OperatorSettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("parkflow_operator_settings");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          localStorage.removeItem("parkflow_operator_settings");
        }
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
  const [printWarning, setPrintWarning] = useState<{
    ticketNumber: string;
    plate: string;
    previewLines: string[];
  } | null>(null);
  const [reprintLoading, setReprintLoading] = useState(false);

  const form = useForm<VehicleEntryFormValues>({
    resolver: zodResolver(vehicleEntrySchema),
    defaultValues: {
      plate: "",
      type: settings.defaultVehicleType,
      countryCode: "CO",
      entryMode: "VISITOR",
      noPlate: false,
      noPlateReason: "",
      rateId: "",
      site: "Principal",
      lane: "",
      booth: "",
      terminal: "",
      observations: "",
      vehicleCondition: settings.skipConditionCheck ? "" : "Sin novedades al ingreso",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      custodiedItems: []
    }
  });

  useEffect(() => {
    if (!initialPlate) return;
    form.setValue("plate", initialPlate.toUpperCase(), { shouldValidate: true, shouldDirty: true });
  }, [form, initialPlate]);

  // Auto-save form data
  const formValues = useWatch({ control: form.control });
  const selectedTypeCode = useWatch({ control: form.control, name: "type" });
  const noPlate = useWatch({ control: form.control, name: "noPlate" });
  const { clearAutoSave } = useAutoSave({
    key: "entry_form",
    data: formValues,
    interval: 2000,
    enabled: Boolean(formValues.plate?.length || formValues.noPlate)
  });

  useEffect(() => {
    // Only load occupancy when runtime config has real capacity (onboarding completed)
    if (runtimeConfig?.capacity && runtimeConfig.capacity.total > 0) {
      loadOccupancy().catch(() => {});
    }
  }, [loadOccupancy, runtimeConfig]);

  useEffect(() => {
    if (runtimeConfig?.operationConfiguration) {
      const { defaultVehicleType, defaultVisitorType, countryCode, platePrefix } = runtimeConfig.operationConfiguration as Record<string, string>;
      if (defaultVehicleType && form.getValues("type") !== defaultVehicleType) {
        form.setValue("type", defaultVehicleType, { shouldValidate: true });
      }
      if (defaultVisitorType && form.getValues("entryMode") !== defaultVisitorType) {
        form.setValue("entryMode", defaultVisitorType as "VISITOR" | "AGREEMENT" | "SUBSCRIBER" | "EMPLOYEE", { shouldValidate: true });
      }
      // Actualizar countryCode desde runtimeConfig
      if (countryCode && form.getValues("countryCode") !== countryCode) {
        form.setValue("countryCode", countryCode, { shouldValidate: true });
      }
      // Actualizar platePrefix desde runtimeConfig
      if (platePrefix && settings.platePrefix !== platePrefix) {
        setSettings(s => ({ ...s, platePrefix }));
      }
    }
  }, [runtimeConfig, form, settings.platePrefix]);

  useEffect(() => {
    let cancelled = false;
    fetchMasterVehicleTypes()
      .then(types => {
        if (cancelled) return;
        if (types.length === 0) {
          console.warn("No vehicle types returned from backend");
          setVehicleTypes([]);
          setLoadingTypes(false);
          return;
        }
        let activeTypes = sortedActiveTypes(types);
        
        // Filtrar por runtimeConfig.vehicleTypes si está configurado
        if (runtimeConfig?.vehicleTypes && runtimeConfig.vehicleTypes.length > 0) {
          const allowedCodes = runtimeConfig.vehicleTypes;
          activeTypes = activeTypes.filter(t => allowedCodes.includes(t.code));
        }
        
        setVehicleTypes(activeTypes);
        const typeCodes = activeTypes.map(t => t.code);
        const currentType = form.getValues("type");
        if (activeTypes.length === 1) {
          form.setValue("type", activeTypes[0].code, { shouldValidate: true });
        } else if (!typeCodes.includes(currentType)) {
          const firstType = activeTypes[0]?.code;
          console.warn(`Current/default type ${currentType} not found, falling back to ${firstType}`);
          if (firstType) {
            form.setValue("type", firstType, { shouldValidate: true });
          }
        }
        setLoadingTypes(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.warn("Could not fetch vehicle types, using fallback:", err);
        let fallbackTypes = [
          { id: "fallback-car", code: "CAR", name: "Carro", isActive: true },
          { id: "fallback-moto", code: "MOTORCYCLE", name: "Moto", isActive: true },
          { id: "fallback-bicycle", code: "BICYCLE", name: "Bicicleta", isActive: true, requiresPlate: false },
          { id: "fallback-van", code: "VAN", name: "Van", isActive: true },
          { id: "fallback-truck", code: "TRUCK", name: "Camión", isActive: true },
          { id: "fallback-bus", code: "BUS", name: "Bus", isActive: true },
          { id: "fallback-electric", code: "ELECTRIC", name: "Eléctrico", isActive: true },
          { id: "fallback-other", code: "OTHER", name: "Otro", isActive: true },
        ];
        // Filtrar fallback types por runtimeConfig si está disponible
        if (runtimeConfig?.vehicleTypes && runtimeConfig.vehicleTypes.length > 0) {
          const allowedCodes = runtimeConfig.vehicleTypes;
          fallbackTypes = fallbackTypes.filter(t => allowedCodes.includes(t.code));
        }
        setVehicleTypes(fallbackTypes);
        setLoadingTypes(false);
      });
    return () => { cancelled = true; };
  }, [settings.defaultVehicleType, form, runtimeConfig?.vehicleTypes]);

  const selectedVehicleType = vehicleTypes.find((type) => type.code === selectedTypeCode);
  const requiresPlate = selectedVehicleType?.requiresPlate ?? true;
  const isMotorcycleOnly = vehicleTypes.length === 1 && vehicleTypes[0]?.code === "MOTORCYCLE";
  const isCarOnly = vehicleTypes.length === 1 && vehicleTypes[0]?.code === "CAR";
  const isSingleType = isMotorcycleOnly || isCarOnly;
  const selectedTypeName = selectedVehicleType?.name?.toLowerCase() || selectedTypeCode?.toLowerCase() || "";
  const isCarroOrMoto = selectedTypeName.includes("moto") || selectedTypeName.includes("carro") || selectedTypeName.includes("auto") || selectedTypeCode === "CAR";
  const configuredSites = useMemo(() => {
    return Array.isArray(runtimeConfig?.sites) ? runtimeConfig.sites : [];
  }, [runtimeConfig]);
  const hasMultipleSites = configuredSites.length > 1;

  useEffect(() => {
    if (configuredSites.length === 1) {
      const single = configuredSites[0];
      const nextSite = String(single?.code ?? single?.name ?? "PRINCIPAL");
      if (nextSite && form.getValues("site") !== nextSite) {
        form.setValue("site", nextSite, { shouldValidate: true });
      }
    }
  }, [configuredSites, form]);

  useEffect(() => {
    if (requiresPlate) {
      form.setValue("noPlate", false, { shouldValidate: true });
      form.setValue("noPlateReason", "", { shouldValidate: true });
      return;
    }
    form.setValue("noPlate", true, { shouldValidate: true });
    form.setValue("plate", "", { shouldValidate: true });
    if (!form.getValues("noPlateReason")?.trim()) {
      form.setValue("noPlateReason", "Tipo de vehículo no requiere placa", { shouldValidate: true });
    }
  }, [requiresPlate, form]);

  useEffect(() => {
    if (!isSingleType) return;
    form.setValue("vehicleCondition", "Sin novedades al ingreso", { shouldValidate: true, shouldDirty: false });
    if (!form.getValues("observations")?.trim()) {
      form.setValue("observations", "Sin observaciones", { shouldValidate: true, shouldDirty: false });
    }
  }, [isSingleType, form]);

  // Persistir settings
  useEffect(() => {
    localStorage.setItem("parkflow_operator_settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!settings.skipConditionCheck) return;
    form.setValue("vehicleCondition", "Sin novedades al ingreso", { shouldValidate: true, shouldDirty: false });
  }, [settings.skipConditionCheck, form]);

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

  const handleDownloadTicket = useCallback(() => {
    if (!printWarning) return;
    downloadTicketAsHtml(printWarning.previewLines, printWarning.ticketNumber, printWarning.plate);
  }, [printWarning]);

  const handleReprint = useCallback(async () => {
    if (!printWarning) return;
    setReprintLoading(true);
    try {
      const user = await currentUser();
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:6011/api/v1/operations";
      const body = validatePayloadOrThrow(
        operationReprintRequestSchema,
        {
          idempotencyKey: newIdempotencyKey(),
          ticketNumber: printWarning.ticketNumber,
          operatorUserId: user?.id ?? "00000000-0000-0000-0000-000000000003",
          reason: "Reimpresion por fallo de impresora en ingreso"
        },
        "Datos de reimpresion invalidos"
      );
      const response = await fetch(`${apiBase}/tickets/reprint`, {
        method: "POST",
        headers: await buildApiHeaders(),
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(text || `Error ${response.status}`);
      }
      toastSuccess("Solicitud de reimpresion enviada");
      setPrintWarning(null);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Error al reimprimir");
    } finally {
      setReprintLoading(false);
    }
  }, [printWarning, toastSuccess, toastError]);

  const handleClosePrintWarning = useCallback(() => {
    setPrintWarning(null);
  }, []);



  const onSubmit = async (values: VehicleEntryFormValues) => {
    const startTime = performance.now();

    if (submitLock.current) return;
    submitLock.current = true;
    setMessage("");
    setError("");

    if (occupancy !== null && occupancy.availableSpaces <= 0) {
      setError("No hay celdas disponibles para este negocio.");
      playError();
      submitLock.current = false;
      return;
    }
    
    // Limpiar auto-save antes de enviar
    clearAutoSave();

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:6011/api/v1/operations";
    const normalizedPlate = values.noPlate
      ? `NP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      : normalizePlate(values.plate);

    const idempotencyFingerprint = JSON.stringify({
      plate: normalizedPlate ?? "",
      type: values.type,
      site: values.site ?? "",
      terminal: values.terminal ?? "",
      entryMode: values.entryMode ?? ""
    });

    try {
      const user = await currentUser();
      if (!user?.id) {
        setError("Sesion requerida para registrar ingresos");
        playError();
        return;
      }

      const idempotencyKey = getOrCreateIdempotencyKey("entry", idempotencyFingerprint);
      idempotencyKeyRef.current = idempotencyKey;

      const resolvedType = resolveVehicleType(values.type, values.countryCode, values.plate);

      const requestBody = buildEntryRequestBody(user, values, settings, idempotencyKeyRef.current, normalizedPlate, resolvedType);

      const response = await fetch(`${apiBase}/entries`, {
        method: "POST",
        headers: await buildApiHeaders(),
        body: JSON.stringify(requestBody)
      });

      const clonedResponse = response.clone();
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const fakeResponse = new Response(JSON.stringify(payload), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
        
        const { normalizeApiError } = await import("@/lib/errors/normalize-api-error");
        const { getUserErrorMessage } = await import("@/lib/errors/get-user-error-message");
        
        if (response.status === 409) {
          setError("Este vehículo ya tiene una entrada activa.");
          playError();
          return;
        }

        const apiError = await normalizeApiError(fakeResponse);
        const userError = getUserErrorMessage(apiError, "tickets.create");
        const errorText = extractValidationError(apiError, userError.description);
        
        setError(errorText);
        playError();
        return;
      }

      clearIdempotencyKey("entry", idempotencyFingerprint);

      const { printWarning, plateLabel, generatedPreviewLines } = await handleEntryPrinting(payload, values);

      if (printWarning) {
        setPrintWarning({
          ticketNumber: payload.receipt.ticketNumber,
          plate: plateLabel,
          previewLines: generatedPreviewLines
        });
      } else {
        const spaceMsg = payload?.receipt?.parkingSpaceCode ? ` · Celda: ${payload.receipt.parkingSpaceCode}` : "";
        const plateMsg = plateLabel ? ` · Placa: ${plateLabel}` : "";
        toastSuccess(`Ingreso registrado - Ticket: ${payload.receipt.ticketNumber}${plateMsg}${spaceMsg}`);
      }
      
      playSuccess();
      incrementStats();
      loadOccupancy().catch(console.error);

      const durationMs = Math.round(performance.now() - startTime);
      writePerfLog("entrySubmit", durationMs, {
        ticketNumber: payload.receipt.ticketNumber,
        plate: values.plate,
        hasPrintWarning: !!printWarning,
        mode: settings.mode
      });

      // Rotar idempotencyKey para el proximo ingreso
      idempotencyKeyRef.current = newIdempotencyKey();

      // Reset form manteniendo configuración
      form.reset({
        plate: "",
        type: isMotorcycleOnly ? "MOTORCYCLE" : settings.defaultVehicleType,
        countryCode: values.countryCode || "CO",
        entryMode: "VISITOR",
        noPlate: false,
        noPlateReason: "",
        rateId: "",
        site: settings.rememberLocation ? values.site : "Principal",
        lane: settings.rememberLocation ? values.lane : "",
        booth: settings.rememberLocation ? values.booth : "",
        terminal: settings.rememberLocation ? values.terminal : "",
        observations: "",
        vehicleCondition: settings.skipConditionCheck ? "" : "Sin novedades al ingreso",
        conditionChecklist: "",
        conditionPhotoUrls: "",
        custodiedItems: []
      });

      focusPlate();
    } catch (err) {
      const validationMessage = toUserMessageFromClientValidation(err);
      if (validationMessage) {
        setError(validationMessage);
        playError();
        return;
      }
      playError();
      const idempotencyFingerprint = JSON.stringify({
        plate: normalizedPlate ?? "",
        type: values.type,
        site: values.site ?? "",
        terminal: values.terminal ?? "",
        entryMode: values.entryMode ?? ""
      });
      if (isNetworkError(err)) {
        const isQueued = await handleOfflineEntry(
          form.getValues("plate"),
          form.getValues("type"),
          idempotencyFingerprint,
          playSuccess,
          toastSuccess,
          toastError
        );
        if (isQueued) {
          incrementStats();
          form.reset({
            plate: "",
            type: isMotorcycleOnly ? "MOTORCYCLE" : settings.defaultVehicleType,
            countryCode: values.countryCode || "CO",
            entryMode: "VISITOR",
            noPlate: false,
            noPlateReason: "",
            vehicleCondition: settings.skipConditionCheck ? "" : "Sin novedades al ingreso",
            custodiedItems: []
          });
          focusPlate();
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
  const quickVehicleTypes = vehicleTypes.filter((type) => type.quickAccess !== false);
  const visibleQuickTypes = quickVehicleTypes.length > 0 ? quickVehicleTypes : vehicleTypes;

  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const handleChildSubmit = useCallback((e?: React.BaseSyntheticEvent) => {
    return form.handleSubmit((values) => onSubmitRef.current(values))(e);
  }, [form]);

  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      handleChildSubmit();
      return;
    }
    if (event.altKey && /^[1-9]$/.test(event.key)) {
      const index = Number(event.key) - 1;
      const selected = visibleQuickTypes[index]?.code;
      if (selected) {
        event.preventDefault();
        form.setValue("type", selected, { shouldValidate: true });
      }
    }
  };

  const handleFormKeyDownRef = useRef(handleFormKeyDown);
  handleFormKeyDownRef.current = handleFormKeyDown;

  const stableHandleFormKeyDown = useCallback((event: KeyboardEvent<HTMLFormElement>) => {
    return handleFormKeyDownRef.current(event);
  }, []);

  return (
    <div className="space-y-4">
      {/* Crash Recovery Dialog */}
      {!disableRecovery && (
        <CrashRecoveryDialog
          formKey="entry_form"
          onRestore={(data) => {
            const recovered = data as VehicleEntryFormValues;
            form.reset(recovered);
            toast.success("Datos recuperados correctamente");
            setShowRecovery(true);
          }}
          onDismiss={() => setShowRecovery(false)}
        />
      )}

      {/* Print Warning */}
      {printWarning && (
        <TicketPrintWarning
          ticketNumber={printWarning.ticketNumber}
          plate={printWarning.plate}
          previewLines={printWarning.previewLines}
          onDownload={handleDownloadTicket}
          onReprint={handleReprint}
          onClose={handleClosePrintWarning}
          reprintLoading={reprintLoading}
        />
      )}

      {/* Header con stats y modo - Solo para modo multi-tipo */}
      {!isSingleType && (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Stats - en móvil se muestran en fila, en desktop también */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-brand-50 rounded-xl px-3 py-2">
            <span className="text-xs text-brand-600 font-medium whitespace-nowrap">Hoy: {stats.today}</span>
          </div>
          <div className="bg-slate-100 rounded-xl px-3 py-2">
            <span className="text-xs text-slate-600 font-medium whitespace-nowrap">Sesión: {stats.session}</span>
          </div>
          {occupancy && (
            <div className={`${occupancy.availableSpaces <= 0 ? "bg-rose-50 border border-rose-100" : "bg-primary-50 border border-primary-100"} rounded-xl px-3 py-2`}>
              <span className={`text-xs ${occupancy.availableSpaces <= 0 ? "text-rose-700 font-bold" : "text-primary-700 font-medium"} whitespace-nowrap`}>
                Disponibles: {occupancy.availableSpaces} / {occupancy.activeSpaces}
              </span>
            </div>
          )}
        </div>

        {/* Selector de modo - ocupa todo el ancho en móvil */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap">Modo:</span>
          <Select
            
            aria-label="Modo de operación"
            value={[settings.mode]}
            onChange={(keys) => {
              const selected = Array.from(keys)[0] as OperatorMode;
              setSettings(s => ({ ...s, mode: selected }));
            }}
            className="w-28 sm:w-32"
            classNames={{
              trigger: "min-h-0 h-8",
            }}
          >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>

            {modeOptions.map((option) => (
              <ListBox.Item key={option.key} textValue={option.label}>{option.label}</ListBox.Item>
            ))}
          
        </ListBox>
      </Select.Popover>
    </Select>
          <Button
            isIconOnly
            size="sm"
            variant="tertiary"
            color="primary"
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
      )}

      {/* Panel de configuración - Solo para modo multi-tipo */}
      {!isSingleType && showSettings && (
        <Card className="bg-slate-50">
          <Card.Content className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-700">Configuración de Operador</h4>
            <div className="flex flex-wrap gap-4">
              <Checkbox
                isSelected={settings.rememberLocation}
                onChange={(checked: any) => setSettings(s => ({ ...s, rememberLocation: checked }))}
                size="sm"
              >
                Recordar ubicación
              </Checkbox>
              <Checkbox
                isSelected={settings.skipConditionCheck}
                onChange={(checked: any) => setSettings(s => ({ ...s, skipConditionCheck: checked }))}
                size="sm"
              >
                Omitir estado vehículo
              </Checkbox>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Tipo por defecto:</label>
              <Select
                
                aria-label="Tipo de vehículo por defecto"
                value={vehicleTypes.some((type) => type.code === settings.defaultVehicleType) ? [settings.defaultVehicleType] : []}
                onChange={(val) => {
                  const selected = val as VehicleType;
                  if (selected) {
                    setSettings(s => ({ ...s, defaultVehicleType: selected }));
                    void form.trigger("plate");
                  }
                }}
                className="w-40"
              >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>

                {vehicleTypes.map((type) => {
                  const config = vehicleTypeView(type);
                  return (
                  <ListBox.Item key={type.code} textValue={config.label}><VehicleTypeIcon code={type.code} size={16} className="inline w-4 h-4 mr-1" /> {config.label}</ListBox.Item>
                  );
                })}
              
        </ListBox>
      </Select.Popover>
    </Select>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Título dinámico */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-brand-600/80 font-semibold">
            Nuevo ingreso
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {isMotorcycleOnly ? "Registrar entrada de moto" : isCarOnly ? "Registrar entrada de carro" : "Registrar entrada de vehículo"}
          </h1>
          {!isSingleType && !(selectedTypeCode && isCarroOrMoto) && (
            <p className="mt-2 text-sm text-slate-500">
              Modo experto disponible. Presione F1 en cualquier momento para volver a esta pantalla.
            </p>
          )}
        </div>
        {isSingleType && occupancy && (
          <p className={`text-sm font-medium px-3 py-1.5 rounded-full ${
            occupancy.availableSpaces <= 0 ? "bg-rose-100 text-rose-700" : "bg-brand-100 text-brand-700"
          }`}>
            {occupancy.availableSpaces <= 0
              ? "Sin celdas disponibles"
              : `${occupancy.availableSpaces} celdas disponibles`}
          </p>
        )}
      </div>

      {/* Formulario Principal */}
      <form onSubmit={handleChildSubmit} onKeyDown={stableHandleFormKeyDown} className={`rounded-2xl space-y-4 ${isSingleType ? "p-4 sm:p-8 border-none shadow-none bg-transparent" : "p-6"}`}>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODO SOLO TIPO — Vista separada UI                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isMotorcycleOnly ? (
          <MotorcycleEntryFormUI
            form={form}
            onSubmit={handleChildSubmit}
            onKeyDown={stableHandleFormKeyDown}
            plateInputRef={plateInputRef as React.MutableRefObject<HTMLInputElement | null>}
            occupancy={occupancy}
            stats={stats}
            isSubmitDisabled={!!printWarning || (occupancy !== null && occupancy.availableSpaces <= 0) || !form.formState.isValid}
            platePrefix={settings.platePrefix}
            noPlate={noPlate}
          />
        ) : isCarOnly ? (
          <CarEntryFormUI
            form={form}
            onSubmit={handleChildSubmit}
            onKeyDown={stableHandleFormKeyDown}
            plateInputRef={plateInputRef as React.MutableRefObject<HTMLInputElement | null>}
            occupancy={occupancy}
            stats={stats}
            isSubmitDisabled={!!printWarning || (occupancy !== null && occupancy.availableSpaces <= 0) || !form.formState.isValid}
            platePrefix={settings.platePrefix}
            noPlate={noPlate}
          />
        ) : (
        /* ═══════════════════════════════════════════════════════════════ */
        /* MODO MULTI-TIPO — Vista completa original                     */
        /* ═══════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          {/* Placa — Input nativo gigante */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-primary-500 rounded-2xl blur opacity-30 group-focus-within:opacity-100 transition duration-500"></div>
            <div className="relative bg-white rounded-2xl p-1">
              <Controller
                name="plate"
                control={form.control as any}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col">
                    <label className="flex items-center justify-between w-full text-base font-semibold px-3 pt-2 pb-1">
                      <span className="text-slate-600">Placa del vehículo</span>
                      {settings.platePrefix && (
                        <span className="text-xs font-bold text-primary-700 bg-primary-100 px-2.5 py-0.5 rounded-md">
                          {settings.platePrefix}
                        </span>
                      )}
                    </label>
                    <input
                      {...field}
                      ref={(e: HTMLInputElement | null) => {
                        field.ref(e);
                        (plateInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                      }}
                      type="text"
                      data-testid="plate"
                      placeholder="ABC123"
                      disabled={noPlate}
                      autoFocus
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleChildSubmit();
                        }
                      }}
                      className={`w-full text-5xl sm:text-6xl font-black uppercase tracking-[0.2em] text-center h-[200px] text-slate-800 placeholder:text-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all rounded-xl border-0 outline-none focus:outline-none focus:ring-0 ${
                        fieldState.error ? "border-2 border-danger" : ""
                      }`}
                      autoComplete="off"
                    />
                    {fieldState.error ? (
                      <p className="text-xs text-danger px-3 pt-1 pb-2">{fieldState.error.message}</p>
                    ) : (
                      <p className="text-xs text-slate-400 px-3 pt-1 pb-2 text-center">
                        Formato esperado: 3 letras + 3 números · Ej: ABC123
                      </p>
                    )}
                  </div>
                )}
              />
            </div>
          </div>



          {noPlate && (
            <Controller
              name="noPlateReason"
              control={form.control as any}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  label="Justificación sin placa"
                  placeholder="Caso especial autorizado"
                  
                  size="sm"
                  isInvalid={!!fieldState.error}
                  errorMessage={fieldState.error?.message}
                />
              )}
            />
          )}

          <Controller
            name="entryMode"
            control={form.control as any}
            render={({ field }) => {
              const opts = [{ key: "VISITOR", label: "Visitante" }, { key: "EMPLOYEE", label: "Empleado" }];
              if (runtimeConfig?.modules?.agreements) opts.push({ key: "AGREEMENT", label: "Convenio" });
              if (runtimeConfig?.modules?.clients || runtimeConfig?.modules?.monthly) opts.push({ key: "SUBSCRIBER", label: "Abonado" });
              if (opts.length <= 2 && !runtimeConfig?.modules?.agreements && !runtimeConfig?.modules?.clients) {
                return <></>; // Hide if only basic modes and modules are explicitly disabled
              }
              return (
              <Select
                aria-label="Tipo de ingreso"
                value={[field.value]}
                onChange={(keys) => field.onChange(Array.from(keys)[0] as string)}
              >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>

                {opts.map((option) => (
                  <ListBox.Item key={option.key} textValue={option.label}>{option.label}</ListBox.Item>
                ))}
              
        </ListBox>
      </Select.Popover>
    </Select>
              );
            }}
          />

          {/* Tipo de Vehículo */}
          <div className={vehicleTypes.length === 1 ? "hidden" : "block"}>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Tipo de Vehículo</label>
              {loadingTypes ? (
                <div className="h-10 w-full bg-slate-100 animate-pulse rounded-lg" />
              ) : isExpert ? (
                // Modo experto: Botones grandes - responsive grid
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
                  {visibleQuickTypes.map((t, index) => {
                    const config = vehicleTypeView(t);
                    const isSelected = selectedTypeCode === t.code;
                    return (
                      <button
                        key={t.code}
                        type="button"
                onClick={() => {
                  form.setValue("type", t.code, { shouldValidate: true, shouldDirty: true });
                  form.trigger("plate");
                }}
                        className={`
                          relative rounded-xl p-2 sm:p-3 text-center transition-all
                          ${isSelected
                            ? "text-white border border-default-200 scale-105"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-600"}
                        `}
                        style={isSelected && config.color ? { backgroundColor: config.color } : undefined}
                      >
                        <div className="text-xl sm:text-2xl mb-1"><VehicleTypeIcon code={t.code} className="mx-auto w-6 h-6" /></div>
                        <div className="text-xs font-medium">{config.label}</div>
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400 border border-default-200">
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
                  control={form.control as any}
                  render={({ field }) => {
                    const validKeys = vehicleTypes.map(t => t.code);
                    const selectedKey = validKeys.includes(field.value) ? field.value : undefined;
                    return (
                      <Select
                        name="type"
                        aria-label="Tipo de vehículo"
                        data-testid="vehicle-type"
                        value={selectedKey ? [selectedKey] : []}
                        isDisabled={vehicleTypes.length === 0 || loadingTypes}
                          onChange={(keys) => {
                            const selected = Array.from(keys as Set<any>)[0] as string;
                            field.onChange(selected);
                            void form.trigger("plate");
                          }}
                      >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>

                        {vehicleTypes.map((t) => {
                          const config = vehicleTypeView(t);
                          return (
                            <ListBox.Item key={t.code} id={t.code} textValue={config.label}>
                              <VehicleTypeIcon code={t.code} size={16} className="inline w-4 h-4 mr-1" /> {config.label}
                            </ListBox.Item>
                          );
                        })}
                      
        </ListBox>
      </Select.Popover>
    </Select>
                    );
                  }}
                />
              )}
              {vehicleTypes.length === 0 && !loadingTypes && (
                <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                  No hay tipos de vehículo disponibles. Verifique la conexión con el servidor.
                </div>
              )}
            </div>
          {/* Botón principal */}
          <div className="pt-2">
            <Button
              type="submit"
              size={isSpeed ? "lg" : "md"}
              isLoading={form.formState.isSubmitting}
              isDisabled={!!printWarning}
              className={`w-full font-bold bg-primary-500 text-white hover:bg-primary-600 ${isSpeed ? "text-lg border border-default-200" : ""}`}
              data-testid="register-entry"
            >
              {form.formState.isSubmitting ? "Registrando..." : isSpeed ? "REGISTRAR INGRESO (Enter)" : "Registrar Ingreso"}
            </Button>
          </div>
        </div>
        )}

        {/* Sección Avanzada - Colapsable — Solo para modo multi-tipo */}
        {!isSingleType && !isSpeed && runtimeConfig?.operationConfiguration?.showAdvancedSection !== false && (
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
                  {hasMultipleSites ? (
                    <Controller
                      name="site"
                      control={form.control as any}
                      render={({ field }) => (
                        <Select
                          aria-label="Sede"
                          value={field.value ? [field.value] : []}
                          onChange={(keys) => {
                            const selected = Array.from(keys)[0] as string | undefined;
                            if (selected) field.onChange(selected);
                          }}
                        >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>

                          {configuredSites.map((site: any) => {
                            const key = String(site.code ?? site.name ?? "PRINCIPAL");
                            return <ListBox.Item key={key} textValue="{String(site.name ?? site.code ?? key)}">{String(site.name ?? site.code ?? key)}</ListBox.Item>;
                          })}
                        
        </ListBox>
      </Select.Popover>
    </Select>
                      )}
                    />
                  ) : null}
                  <Controller
                    name="lane"
                    control={form.control as any}
                    render={({ field }) => (
                      <Input {...field} label="Carril" placeholder="1"  size="sm" />
                    )}
                  />
                  <Controller
                    name="booth"
                    control={form.control as any}
                    render={({ field }) => (
                      <Input {...field} label="Caja" placeholder="Caja 1"  size="sm" />
                    )}
                  />
                  <Controller
                    name="terminal"
                    control={form.control as any}
                    render={({ field }) => (
                      <Input {...field} label="Terminal" placeholder="T1"  size="sm" />
                    )}
                  />
                </div>

                {/* Tarifa */}
                <Controller
                  name="countryCode"
                  control={form.control as any}
                  render={({ field }) => (
                    <Input {...field} label="País placa" placeholder="CO"  size="sm" maxLength={2} />
                  )}
                />

                <Controller
                  name="rateId"
                  control={form.control as any}
                  render={({ field }) => (
                    <Input {...field} label="Tarifa (opcional)" placeholder="ID de tarifa específica"  size="sm" />
                  )}
                />

                <Controller
                  name="parkingSpaceId"
                  control={form.control as any}
                  render={({ field: { value, onChange, ...field } }) => (
                    <Select
                      {...field}
                      aria-label="Celda (opcional)"
                      placeholder="Seleccionar celda..."
                      selectedKey={value || null}
                      onSelectionChange={(keys) => {
                        const arr = Array.from((keys as any) || []);
                        onChange(arr.length ? String(arr[0]) : "");
                      }}
                      size="sm"
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {spaces.map(s => (
                            <ListBox.Item key={s.id} textValue={`${s.code} ${s.label ? `(${s.label})` : ""}`}>
                              {s.code} {s.label ? `(${s.label})` : ""}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                />

                {/* Campos Dinámicos / Autogenerados por Configuración */}
                <FormLayoutFactory
                  layout={ENTRY_FORM_LAYOUT}
                  control={form.control as any}
                  selectedVehicleType={selectedTypeCode}
                  skipConditionCheck={settings.skipConditionCheck}
                />

              </div>
            )}
          </div>
        )}

        {/* Mensajes */}
        {message && (
          <div className="flex items-center gap-2 text-sm text-primary-700 bg-primary-50 rounded-xl px-4 py-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {message}
          </div>
        )}
        {error && (
          <div data-testid="error-message" className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 rounded-xl px-4 py-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

      </form>

      {/* Tips según modo — Solo para modo multi-tipo */}
      {!isSingleType && (
      <div className="bg-brand-50/50 rounded-xl p-4 text-sm">
        <p className="font-semibold text-brand-800 mb-1 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m12.728 0l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          Modo {settings.mode === "beginner" ? "Principiante" : settings.mode === "expert" ? "Experto" : "Velocidad"}
        </p>
        <p className="text-brand-700">
          {settings.mode === "beginner" && "Todos los campos disponibles. Use este modo mientras aprende el sistema."}
          {settings.mode === "expert" && "Campos avanzados colapsados. Use botones rápidos para tipo de vehículo. Acceso rápido con teclas 1-5."}
          {settings.mode === "speed" && "Máxima velocidad: Solo placa es obligatoria. Presione Enter para guardar inmediatamente. Tipo por defecto: " + (vehicleTypes.find(t => t.code === settings.defaultVehicleType)?.name || settings.defaultVehicleType)}
        </p>
      </div>
      )}
    </div>
  );
}
