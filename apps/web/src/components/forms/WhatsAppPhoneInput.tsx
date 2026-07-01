import React from "react";
import { Controller } from "react-hook-form";
import { Input } from "@/components/bridge/Input";
import { useTenantConfig } from "@/providers/TenantConfigProvider";

export function WhatsAppPhoneInput({ control }: { control: any }) {
  const { runtimeConfig } = useTenantConfig();
  const isWhatsApp = runtimeConfig?.operationConfiguration?.printerType === "WHATSAPP";
  const phonePattern = /^\+?[0-9\s()-]{7,20}$/;

  if (!isWhatsApp) return null;

  return (
    <Controller
      name="customerPhoneNumber"
      control={control}
      rules={{
        required: "Ingresa el WhatsApp del conductor.",
        validate: (value: string) =>
          !value || phonePattern.test(value.trim()) || "Ingresa un número de WhatsApp válido.",
      }}
      render={({ field, fieldState }) => (
        <Input
          {...field}
          label="WhatsApp del conductor"
          placeholder="Ej: +573001234567"
          type="tel"
          isRequired
          size="md"
          isInvalid={!!fieldState.error}
          errorMessage={fieldState.error?.message}
          description="Se enviará el ticket de ingreso por WhatsApp"
        />
      )}
    />
  );
}
