"use client";

import React from "react";
import { Controller, useWatch, Control } from "react-hook-form";

import { Input } from "@/components/ui/Input";
import { useTenantConfig } from "@/lib/hooks/useTenantConfig";

interface HelmetSectionProps {
  control: Control<any>;
  selectedVehicleType: string;
}

export function HelmetSection({ control, selectedVehicleType }: HelmetSectionProps) {
  const { getOperationConfigValue } = useTenantConfig();
  const helmetDelivered = useWatch({ control, name: "helmetDelivered" });

  const enableCustodiedItem = getOperationConfigValue<boolean>("enableCustodiedItem", true);

  if (selectedVehicleType !== "MOTORCYCLE" || !enableCustodiedItem) {
    return null;
  }

  return (
    <>
      <div className="col-span-2 border-t border-slate-200/50 pt-3 mt-1">
        <p className="text-sm font-medium text-slate-700 mb-2">Información del Casco</p>
        <Controller
          name="helmetDelivered"
          control={control}
          render={({ field }) => (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span className="text-sm text-slate-600 dark:text-slate-300">¿Entrega casco al ingreso?</span>
            </label>
          )}
        />
      </div>
      {helmetDelivered && (
        <div className="col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Controller
            name="helmetIdentifier"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                {...field}
                label="Número de Casco"
                placeholder="Ej: SHOEI-1234"
                
                size="sm"
                isInvalid={!!fieldState.error}
                errorMessage={fieldState.error?.message}
                isRequired
              />
            )}
          />
          <Controller
            name="helmetObservations"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                {...field}
                label="Observaciones del casco"
                placeholder="Marca, color, etc."
                
                size="sm"
                isInvalid={!!fieldState.error}
                errorMessage={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name="helmetPhotoUrl"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                {...field}
                label="Foto del casco (URL)"
                placeholder="https://..."
                
                size="sm"
                isInvalid={!!fieldState.error}
                errorMessage={fieldState.error?.message}
              />
            )}
          />
        </div>
      )}
    </>
  );
}
