"use client";

import React from "react";
import { Controller, Control } from "react-hook-form";

import { Input } from "@/components/ui/Input";
import { useTenantConfig } from "@/lib/hooks/useTenantConfig";

interface ObservationsInputProps {
  control: Control<any>;
}

export function ObservationsInput({ control }: ObservationsInputProps) {
  const { getOperationConfigValue } = useTenantConfig();
  const enableObservations = getOperationConfigValue<boolean>("enableObservations", true);

  if (!enableObservations) {
    return null;
  }

  return (
    <Controller
      name="observations"
      control={control}
      render={({ field, fieldState }) => (
        <Input
          {...field}
          label="Observaciones"
          placeholder="Notas adicionales"
          
          size="sm"
          isInvalid={!!fieldState.error}
          errorMessage={fieldState.error?.message}
        />
      )}
    />
  );
}
