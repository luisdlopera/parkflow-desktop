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
import { useOperationSounds } from "@/lib/hooks/useOperationSounds";
import { toast } from "@heroui/react";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { CrashRecoveryDialog } from "@/components/ui/CrashRecoveryDialog";
import type { VehicleType } from "@parkflow/types";
import { useTenantConfig } from "@/lib/providers/TenantConfigProvider";
import { FormLayoutFactory } from "@/components/forms/dynamic/FormLayoutFactory";
import { type RegisteredFieldKey } from "@/components/forms/dynamic/form-registry";
import { MotorcycleEntryFormUI } from "@/components/forms/motorcycle/MotorcycleEntryFormUI";
import { CarEntryFormUI } from "@/components/forms/car/CarEntryFormUI";
import { VehicleTypeIcon } from "@/components/vehicles/VehicleTypeIcon";
import VehicleEntryHeader from "@/components/forms/VehicleEntryHeader";
import VehicleEntrySettings from "@/components/forms/VehicleEntrySettings";
import PlateInput from "@/components/forms/PlateInput";
import VehicleTypeSelector from "@/components/forms/VehicleTypeSelector";
import AdvancedEntryOptions from "@/components/forms/AdvancedEntryOptions";

// Feature hooks
import { useOperatorSettings, type OperatorMode } from "@/features/vehicle-entry/hooks/useOperatorSettings";
import { useEntryOccupancy } from "@/features/vehicle-entry/hooks/useEntryOccupancy";
import { useEntryStats } from "@/features/vehicle-entry/hooks/useEntryStats";
import { useVehicleTypes } from "@/features/vehicle-entry/hooks/useVehicleTypes";
import { useVehicleEntry } from "@/features/vehicle-entry/hooks/useVehicleEntry";
import { useEntryPrinting } from "@/features/vehicle-entry/hooks/useEntryPrinting";

const ENTRY_FORM_LAYOUT: RegisteredFieldKey[] = [
  "vehicle_condition",
  "helmet_section",
  "observations",
];

const modeOptions = [
  { key: "beginner", label: "Principiante" },
  { key: "expert", label: "Experto" },
  { key: "speed", label: "Velocidad" },
];

function vehicleTypeView(type: { code: string; name: string; color?: string }) {
  return { label: type.name || type.code, color: type.color || "" };
}

export default function VehicleEntryFormV2({
  initialPlate = "",
  disableRecovery = false,
}: {
  initialPlate?: string;
  disableRecovery?: boolean;
}) {
  const [error, setError] = useState("");
  const plateInputRef = useRef<HTMLInputElement>(null);
  const { runtimeConfig } = useTenantConfig();
  const { playSuccess, playError } = useOperationSounds();
  const toastSuccess = toast.success;
  const toastError = toast.danger;

  const { settings, update: updateSettings } = useOperatorSettings();
  const [showAdvanced, setShowAdvanced] = useState(false);
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
      custodiedItems: [],
    },
  });

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
  const hasMultipleSites = configuredSites.length > 1;

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
              !form.formState.isValid
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
              !form.formState.isValid
            }
            platePrefix={settings.platePrefix}
            noPlate={noPlate}
          />
        ) : (
          <div className="space-y-4">
            {/* Placa */}
            <PlateInput control={form.control} onSubmit={() => handleChildSubmit()} plateInputRef={plateInputRef} noPlate={noPlate} platePrefix={settings.platePrefix} />

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
                const opts = [
                  { key: "VISITOR", label: "Visitante" },
                  { key: "EMPLOYEE", label: "Empleado" },
                ];
                if (runtimeConfig?.modules?.agreements)
                  opts.push({ key: "AGREEMENT", label: "Convenio" });
                if (runtimeConfig?.modules?.clients || runtimeConfig?.modules?.monthly)
                  opts.push({ key: "SUBSCRIBER", label: "Abonado" });
                if (
                  opts.length <= 2 &&
                  !runtimeConfig?.modules?.agreements &&
                  !runtimeConfig?.modules?.clients
                )
                  return <></>;
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
                        {opts.map((o) => (
                          <ListBox.Item key={o.key} textValue={o.label}>
                            {o.label}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                );
              }}
            />

            {/* Tipo de vehículo */}
            <div className={vehicleTypes.length === 1 ? "hidden" : "block"}>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Tipo de Vehículo
              </label>
              <VehicleTypeSelector
                vehicleTypes={vehicleTypes}
                loadingTypes={loadingTypes}
                isExpert={isExpert}
                visibleQuickTypes={visibleQuickTypes}
                selectedTypeCode={selectedTypeCode}
                control={form.control}
                setValue={form.setValue}
                trigger={form.trigger}
              />
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
                {form.formState.isSubmitting
                  ? "Registrando..."
                  : isSpeed
                    ? "REGISTRAR INGRESO (Enter)"
                    : "Registrar Ingreso"}
              </Button>
            </div>
          </div>
        )}

        {/* Sección avanzada — solo multi-tipo */}
        {!isSingleType &&
          !isSpeed &&
          runtimeConfig?.operationConfiguration?.showAdvancedSection !== false && (
            <div className="border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
                {showAdvanced ? "Ocultar opciones avanzadas" : "Mostrar opciones avanzadas"}
              </button>

              {showAdvanced && (
                <AdvancedEntryOptions
                  configuredSites={configuredSites}
                  hasMultipleSites={hasMultipleSites}
                  spaces={spaces}
                  control={form.control}
                  ENTRY_FORM_LAYOUT={ENTRY_FORM_LAYOUT}
                  settings={settings}
                  selectedTypeCode={selectedTypeCode}
                />
              )}
            </div>
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
