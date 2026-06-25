import React from "react";
import { Controller } from "react-hook-form";
import { ListBox } from "@heroui/react";
import { Input } from "@/components/bridge/Input";
import { Select } from "@/components/bridge/Select";
import { Button } from "@/components/bridge/Button";
import PlateInput from "@/components/forms/PlateInput";
import VehicleTypeSelector from "@/components/forms/VehicleTypeSelector";
import type { VehicleType } from "@parkflow/types";
import { WhatsAppPhoneInput } from "@/components/forms/WhatsAppPhoneInput";

interface MixedEntryFormUIProps {
  form: any;
  onSubmit: (e?: React.BaseSyntheticEvent) => void;
  plateInputRef: React.MutableRefObject<HTMLInputElement | null>;
  noPlate: boolean;
  platePrefix?: string;
  flags: any;
  vehicleTypes: any;
  loadingTypes: boolean;
  isExpert: boolean;
  isSpeed: boolean;
  visibleQuickTypes: any;
  selectedTypeCode: string;
  isSubmitting: boolean;
  printWarning: any;
}

export function MixedEntryFormUI({
  form,
  onSubmit,
  plateInputRef,
  noPlate,
  platePrefix,
  flags,
  vehicleTypes,
  loadingTypes,
  isExpert,
  isSpeed,
  visibleQuickTypes,
  selectedTypeCode,
  isSubmitting,
  printWarning,
}: MixedEntryFormUIProps) {
  return (
    <div className="space-y-4">
      {/* Placa */}
      {!noPlate && (
        <PlateInput
          control={form.control}
          onSubmit={() => onSubmit()}
          plateInputRef={plateInputRef}
          noPlate={noPlate}
          platePrefix={platePrefix}
          vehicleType={selectedTypeCode}
        />
      )}

      {noPlate && (
        <Controller
          name="noPlateReason"
          control={form.control}
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
        control={form.control}
        render={({ field }) => {
          const opts = [
            { key: "VISITOR", label: "Visitante" },
            { key: "EMPLOYEE", label: "Empleado" },
          ];
          if (flags.agreements) opts.push({ key: "AGREEMENT", label: "Convenio" });
          if (flags.memberships) opts.push({ key: "SUBSCRIBER", label: "Abonado" });
          if (opts.length <= 2 && !flags.agreements && !flags.memberships) return <></>;
          return (
            <Select
              aria-label="Tipo de ingreso"
              value={[field.value]}
              onChange={(keys) => field.onChange(Array.from(keys)[0] as string)}
            >
              <Select.Trigger aria-label="Seleccionar opción">
                <Select.Value aria-label="Seleccionar opción" />
                <Select.Indicator aria-label="Seleccionar opción" />
              </Select.Trigger>
              <Select.Popover aria-label="Seleccionar opción">
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
        <label className="text-sm font-semibold text-slate-700 mb-2 block">Tipo de Vehículo</label>
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

      <WhatsAppPhoneInput control={form.control} />
      {/* Botón principal */}
      <div className="pt-2">
        <Button
          type="submit"
          size={isSpeed ? "lg" : "md"}
          isLoading={isSubmitting}
          isDisabled={!!printWarning}
          className={`w-full font-bold bg-brand text-white hover:bg-brand-600 ${isSpeed ? "text-lg border border-brand" : ""}`}
          data-testid="register-entry"
        >
          {isSubmitting ? "Registrando..." : isSpeed ? "REGISTRAR INGRESO (Enter)" : "Registrar Ingreso"}
        </Button>
      </div>
    </div>
  );
}
