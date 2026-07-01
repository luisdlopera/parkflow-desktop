"use client";

import React from "react";
import { Controller, Control } from "react-hook-form";

import { Input } from "@/components/bridge/Input";
import { useRuntimeConfig } from "@/features/configuration/hooks/useRuntimeConfig";

interface ObservationsInputProps {
  control: Control<any>;
}

export function ObservationsInput({ control }: ObservationsInputProps) {
  const { config } = useRuntimeConfig();
  const enableObservations = config?.operationConfiguration?.enableObservations ?? true;

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
