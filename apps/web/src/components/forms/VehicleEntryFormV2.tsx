"use client";
import { ListBox } from "@heroui/react";
import { Card } from "@/components/bridge/Card";
import { Select } from "@/components/bridge/Select";
import { Button } from "@/components/bridge/Button";
import { Checkbox } from "@/components/bridge/Checkbox";
import { Input } from "@/components/bridge/Input";
import { useRef, useState, useCallback, useEffect, useMemo, type KeyboardEvent } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import TicketPrintWarning from "@/components/tickets/TicketPrintWarning";
import { vehicleEntrySchema, VehicleEntryFormValues } from "@/modules/parking/vehicle.schema";
import { useOperationSounds } from "@/hooks/ui/useOperationSounds";
import { toast } from "@heroui/react";
import { useAutoSave } from "@/hooks/core/useAutoSave";
import { CrashRecoveryDialog } from "@/components/feedback/CrashRecoveryDialog";
import type { VehicleType } from "@parkflow/types";
import { useTenantConfig } from "@/providers/TenantConfigProvider";
import { FormLayoutFactory } from "@/components/forms/dynamic/FormLayoutFactory";

import { MotorcycleEntryFormUI } from "@/components/forms/motorcycle/MotorcycleEntryFormUI";
import { CarEntryFormUI } from "@/components/forms/car/CarEntryFormUI";
import { VehicleTypeIcon } from "@/components/vehicles/VehicleTypeIcon";
import VehicleEntryHeader from "@/components/forms/VehicleEntryHeader";
import VehicleEntrySettings from "@/components/forms/VehicleEntrySettings";
import PlateInput from "@/components/forms/PlateInput";
import VehicleTypeSelector from "@/components/forms/VehicleTypeSelector";
import { MixedEntryFormUI } from "@/components/forms/mixed/MixedEntryFormUI";


// Feature hooks
import { useOperatorSettings, type OperatorMode } from "@/features/vehicle-entry/hooks/useOperatorSettings";
import { useEntryOccupancy } from "@/features/vehicle-entry/hooks/useEntryOccupancy";
import { useEntryStats } from "@/features/vehicle-entry/hooks/useEntryStats";
import { useVehicleTypes } from "@/features/vehicle-entry/hooks/useVehicleTypes";
import { useVehicleEntry } from "@/features/vehicle-entry/hooks/useVehicleEntry";
import { useEntryPrinting } from "@/features/vehicle-entry/hooks/useEntryPrinting";

const modeOptions = [
  { key: "beginner", label: "Principiante" },
  { key: "expert", label: "Experto" },
  { key: "speed", label: "Velocidad" },
];

function vehicleTypeView(type: { code: string; name: string; color?: string }) {
  return { label: type.name || type.code, color: type.color || "" };
}

import { useFeatureFlags } from "@/components/providers/FeatureFlagProvider";

export default function VehicleEntryFormV2({
  initialPlate = "",
  disableRecovery = false,
}: {
  initialPlate?: string;
  disableRecovery?: boolean;
}) {
  const flags = useFeatureFlags();
  const [error, setError] = useState("");
  const plateInputRef = useRef<HTMLInputElement>(null);
  const { runtimeConfig } = useTenantConfig();
  const { playSuccess, playError } = useOperationSounds();
  const toastSuccess = toast.success;
  const toastError = toast.danger;

  const { settings, update: updateSettings } = useOperatorSettings();
  const [showSettings, setShowSettings] = useState(false);

  const capacityEnabled = Boolean(runtimeConfig?.capacity && runtimeConfig.capacity.total > 0);
  const { occupancy, spaces, reload: reloadOccupancy } = useEntryOccupancy(capacityEnabled);
  const { stats, increment: incrementStats } = useEntryStats();
  const { vehicleTypes, loading: loadingTypes } = useVehicleTypes(
    runtimeConfig?.vehicleTypes as string[] | undefined,
  );

  const {
    printWarning,
    reprintLoading,
    showPrintWarning,
    clearPrintWarning,
    handleDownload: handleDownloadTicket,
    handleReprint: handleReprintFn,
  } = useEntryPrinting();

  const form = useForm<VehicleEntryFormValues>({
    resolver: zodResolver(vehicleEntrySchema),
    mode: "onChange",
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
      vehicleCondition: "Sin novedades al ingreso",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      custodiedItems: [],
    },
  });

  const { isValid, isSubmitting } = form.formState;

  // Sync initialPlate
  useEffect(() => {
    if (!initialPlate) return;
    form.setValue("plate", initialPlate.toUpperCase(), { shouldValidate: true, shouldDirty: true });
  }, [form, initialPlate]);

  // Sync runtimeConfig → form defaults
  useEffect(() => {
    if (!runtimeConfig?.operationConfiguration) return;
    const { defaultVehicleType, defaultVisitorType, countryCode, platePrefix } =
      runtimeConfig.operationConfiguration as Record<string, string>;
    if (defaultVehicleType && form.getValues("type") !== defaultVehicleType)
      form.setValue("type", defaultVehicleType, { shouldValidate: true });
    if (defaultVisitorType && form.getValues("entryMode") !== defaultVisitorType)
      form.setValue("entryMode", defaultVisitorType as VehicleEntryFormValues["entryMode"], { shouldValidate: true });
    if (countryCode && form.getValues("countryCode") !== countryCode)
      form.setValue("countryCode", countryCode, { shouldValidate: true });
    if (platePrefix && settings.platePrefix !== platePrefix)
      updateSettings({ platePrefix });
  }, [runtimeConfig, form, settings.platePrefix, updateSettings]);

  const selectedTypeCode = useWatch({ control: form.control, name: "type" });
  const noPlate = useWatch({ control: form.control, name: "noPlate" });

  // Sync active vehicle type → plate/noPlate fields
  const selectedVehicleType = vehicleTypes.find((t) => t.code === selectedTypeCode);
  const requiresPlate = selectedVehicleType?.requiresPlate ?? true;

  useEffect(() => {
    if (requiresPlate) {
      form.setValue("noPlate", false, { shouldValidate: true });
      form.setValue("noPlateReason", "", { shouldValidate: true });
    } else {
      form.setValue("noPlate", true, { shouldValidate: true });
      form.setValue("plate", "", { shouldValidate: true });
      if (!form.getValues("noPlateReason")?.trim())
        form.setValue("noPlateReason", "Tipo de vehículo no requiere placa", { shouldValidate: true });
    }
  }, [requiresPlate, form]);

  // Set vehicle type once types load
  useEffect(() => {
    if (vehicleTypes.length === 0) return;
    const codes = vehicleTypes.map((t) => t.code);
    const current = form.getValues("type");
    if (vehicleTypes.length === 1) {
      form.setValue("type", vehicleTypes[0].code, { shouldValidate: true });
    } else if (!codes.includes(current) && vehicleTypes[0]) {
      form.setValue("type", vehicleTypes[0].code, { shouldValidate: true });
    }
  }, [vehicleTypes, form]);

  // Single site auto-fill
  const configuredSites = useMemo(
    () => (Array.isArray(runtimeConfig?.sites) ? runtimeConfig.sites : []),
    [runtimeConfig],
  );

  useEffect(() => {
    if (configuredSites.length !== 1) return;
    const single = configuredSites[0];
    const nextSite = String(single?.code ?? single?.name ?? "PRINCIPAL");
    if (nextSite && form.getValues("site") !== nextSite)
      form.setValue("site", nextSite, { shouldValidate: true });
  }, [configuredSites, form]);

  // skipConditionCheck → pre-fill vehicleCondition
  useEffect(() => {
    if (!settings.skipConditionCheck) return;
    form.setValue("vehicleCondition", "Sin novedades al ingreso", { shouldValidate: true, shouldDirty: false });
  }, [settings.skipConditionCheck, form]);

  // Auto-focus plate on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      plateInputRef.current?.focus();
      plateInputRef.current?.select();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const formValues = useWatch({ control: form.control });
  const { clearAutoSave } = useAutoSave({
    key: "entry_form",
    data: formValues,
    interval: 2000,
    enabled: Boolean(formValues.plate?.length || formValues.noPlate),
  });

  const focusPlate = useCallback(() => {
    setTimeout(() => {
      plateInputRef.current?.focus();
      plateInputRef.current?.select();
    }, 100);
  }, []);

  const isMotorcycleOnly = vehicleTypes.length === 1 && vehicleTypes[0]?.code === "MOTORCYCLE";
  const isCarOnly = vehicleTypes.length === 1 && vehicleTypes[0]?.code === "CAR";
  const isSingleType = isMotorcycleOnly || isCarOnly;
  const selectedTypeName = selectedVehicleType?.name?.toLowerCase() || selectedTypeCode?.toLowerCase() || "";
  const isCarroOrMoto =
    selectedTypeName.includes("moto") ||
    selectedTypeName.includes("carro") ||
    selectedTypeName.includes("auto") ||
    selectedTypeCode === "CAR";

  const { submit } = useVehicleEntry({
    form,
    settings,
    occupancy,
    isMotorcycleOnly,
    clearAutoSave,
    onSuccess: ({ ticketNumber, plate, previewLines, printWarning: pw, spaceCode }) => {
      if (pw) {
        showPrintWarning({ ticketNumber, plate, previewLines });
      } else {
        const spaceMsg = spaceCode ? ` · Celda: ${spaceCode}` : "";
        const plateMsg = plate ? ` · Placa: ${plate}` : "";
        toastSuccess(`Ingreso registrado - Ticket: ${ticketNumber}${plateMsg}${spaceMsg}`);
      }
      playSuccess();
      setError("");
      focusPlate();
    },
    onError: (msg) => {
      setError(msg);
      playError();
    },
    onOfflineQueued: () => {
      toastSuccess(
        "Sin internet: ingreso guardado en cola offline. Será sincronizado automáticamente.",
      );
      playSuccess();
      setError("");
      focusPlate();
    },
    onIncrementStats: incrementStats,
    onReloadOccupancy: () => { reloadOccupancy().catch(() => {}); },
  });

  const handleChildSubmit = useCallback(
    (e?: React.BaseSyntheticEvent) => form.handleSubmit(submit)(e),
    [form, submit],
  );

  const isExpert = settings.mode === "expert" || settings.mode === "speed";
  const isSpeed = settings.mode === "speed";
  const visibleQuickTypes = vehicleTypes.filter((t) => t.quickAccess !== false);

  const handleFormKeyDown = useCallback(
    (event: KeyboardEvent<HTMLFormElement>) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void handleChildSubmit();
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
    },
    [handleChildSubmit, visibleQuickTypes, form],
  );

  return (
    <div className="space-y-4">
      {/* Crash Recovery */}
      {!disableRecovery && (
        <CrashRecoveryDialog
          formKey="entry_form"
          onRestore={(data) => {
            form.reset(data as VehicleEntryFormValues);
            toast.success("Datos recuperados correctamente");
          }}
          onDismiss={() => {}}
        />
      )}

      {/* Print Warning */}
      {printWarning && (
        <TicketPrintWarning
          ticketNumber={printWarning.ticketNumber}
          plate={printWarning.plate}
          previewLines={printWarning.previewLines}
          onDownload={handleDownloadTicket}
          onReprint={() =>
            handleReprintFn(
              (msg) => toastSuccess(msg),
              (msg) => toastError(msg),
            )
          }
          onClose={clearPrintWarning}
          reprintLoading={reprintLoading}
        />
      )}

      {/* Header stats + mode selector — extraído a componente */}
      <VehicleEntryHeader
        stats={stats}
        occupancy={occupancy}
        settings={settings}
        updateSettings={updateSettings}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        isSingleType={isSingleType}
      />

      <VehicleEntrySettings
        isSingleType={isSingleType}
        showSettings={showSettings}
        settings={settings}
        updateSettings={updateSettings}
        vehicleTypes={vehicleTypes}
      />

      {/* Título dinámico */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-brand-600/80 font-semibold">
            Nuevo ingreso
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {isMotorcycleOnly
              ? "Registrar entrada de moto"
              : isCarOnly
                ? "Registrar entrada de carro"
                : "Registrar entrada de vehículo"}
          </h1>
        </div>
        {isSingleType && occupancy && (
          <p
            className={`text-sm font-medium px-3 py-1.5 rounded-full ${
              occupancy.availableSpaces <= 0
                ? "bg-rose-100 text-rose-700"
                : "bg-brand-100 text-brand-700"
            }`}
          >
            {occupancy.availableSpaces <= 0
              ? "Sin celdas disponibles"
              : `${occupancy.availableSpaces} celdas disponibles`}
          </p>
        )}
      </div>

      {/* Formulario principal */}
      <form
        onSubmit={handleChildSubmit}
        onKeyDown={handleFormKeyDown}
        className={`rounded-2xl space-y-4 ${isSingleType ? "p-4 sm:p-8 border-none shadow-none bg-transparent" : "p-6"}`}
      >
        {isMotorcycleOnly ? (
          <MotorcycleEntryFormUI
            form={form}
            onSubmit={handleChildSubmit}
            onKeyDown={handleFormKeyDown}
            plateInputRef={plateInputRef as React.MutableRefObject<HTMLInputElement | null>}
            occupancy={occupancy}
            stats={stats}
            isSubmitDisabled={
              !!printWarning ||
              (occupancy !== null && occupancy.availableSpaces <= 0) ||
              !isValid
            }
            platePrefix={settings.platePrefix}
            noPlate={noPlate}
          />
        ) : isCarOnly ? (
          <CarEntryFormUI
            form={form}
            onSubmit={handleChildSubmit}
            onKeyDown={handleFormKeyDown}
            plateInputRef={plateInputRef as React.MutableRefObject<HTMLInputElement | null>}
            occupancy={occupancy}
            stats={stats}
            isSubmitDisabled={
              !!printWarning ||
              (occupancy !== null && occupancy.availableSpaces <= 0) ||
              !isValid
            }
            platePrefix={settings.platePrefix}
            noPlate={noPlate}
          />
        ) : (
          <MixedEntryFormUI
            form={form}
            onSubmit={handleChildSubmit}
            plateInputRef={plateInputRef as React.MutableRefObject<HTMLInputElement | null>}
            noPlate={noPlate}
            platePrefix={settings.platePrefix}
            flags={flags}
            vehicleTypes={vehicleTypes}
            loadingTypes={loadingTypes}
            isExpert={isExpert}
            isSpeed={isSpeed}
            visibleQuickTypes={visibleQuickTypes}
            selectedTypeCode={selectedTypeCode}
            isSubmitting={isSubmitting}
            printWarning={printWarning}
          />
        )}



        {/* Error */}
        {error && (
          <div
            data-testid="error-message"
            className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 rounded-xl px-4 py-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        )}
      </form>

      {/* Tips — solo multi-tipo */}
      {!isSingleType && (
        <div className="bg-brand-50/50 rounded-xl p-4 text-sm">
          <p className="font-semibold text-brand-800 mb-1">
            Modo{" "}
            {settings.mode === "beginner"
              ? "Principiante"
              : settings.mode === "expert"
                ? "Experto"
                : "Velocidad"}
          </p>
          <p className="text-brand-700">
            {settings.mode === "beginner" &&
              "Todos los campos disponibles. Use este modo mientras aprende el sistema."}
            {settings.mode === "expert" &&
              "Campos avanzados colapsados. Use botones rápidos para tipo de vehículo. Acceso rápido con teclas 1-5."}
            {settings.mode === "speed" &&
              `Máxima velocidad: Solo placa es obligatoria. Tipo por defecto: ${vehicleTypes.find((t) => t.code === settings.defaultVehicleType)?.name || settings.defaultVehicleType}`}
          </p>
        </div>
      )}
    </div>
  );
}
