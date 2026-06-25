import React from "react";
import { Controller } from "react-hook-form";
import { Input } from "@/components/bridge/Input";
import { useTenantConfig } from "@/providers/TenantConfigProvider";

export function WhatsAppPhoneInput({ control }: { control: any }) {
  const { runtimeConfig } = useTenantConfig();
  const isWhatsApp = runtimeConfig?.operationConfiguration?.printerType === "WHATSAPP";

  if (!isWhatsApp) return null;

  return (
    <Controller
      name="customerPhoneNumber"
      control={control}
      render={({ field, fieldState }) => (
        <Input
          {...field}
          label="WhatsApp del conductor"
          placeholder="Ej: +573001234567"
          size="md"
          isInvalid={!!fieldState.error}
          errorMessage={fieldState.error?.message}
          description="Se enviará el ticket de ingreso por WhatsApp"
        />
      )}
    />
  );
}
