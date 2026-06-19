"use client";

import React from "react";
import { Controller, Control } from "react-hook-form";

import { Input } from "@/components/bridge/Input";
import { useRuntimeConfig } from "@/lib/useRuntimeConfig";

interface VehicleConditionInputProps {
  control: Control<any>;
  skipConditionCheck?: boolean;
}

export function VehicleConditionInput({ control, skipConditionCheck = false }: VehicleConditionInputProps) {
  const { config } = useRuntimeConfig();
  const enableVehicleCondition = config?.operationConfiguration?.enableVehicleCondition ?? true;

  if (skipConditionCheck || !enableVehicleCondition) {
    return null;
  }

  return (
    <Controller
      name="vehicleCondition"
      control={control}
      render={({ field, fieldState }) => (
        <Input
          {...field}
          label="Estado del vehículo"
          placeholder="Sin novedades al ingreso"
          
          size="sm"
          isInvalid={!!fieldState.error}
          errorMessage={fieldState.error?.message}
        />
      )}
    />
  );
}
