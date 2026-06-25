"use client";
import React from "react";
import { Controller, FieldValues } from "react-hook-form";
import { ListBox } from "@heroui/react";
import { Select } from "@/components/bridge/Select";
import { Input } from "@/components/bridge/Input";
import { FormLayoutFactory } from "@/components/forms/dynamic/FormLayoutFactory";

interface AdvancedEntryOptionsProps<T extends FieldValues> {
  configuredSites: Array<{ code?: string; name?: string }>;
  hasMultipleSites: boolean;
  spaces: Array<{ id: string; code: string; label?: string }>;
  control: any; // From react-hook-form useForm hook
  ENTRY_FORM_LAYOUT: any; // Dynamic form layout configuration
  settings: { skipConditionCheck?: boolean };
  selectedTypeCode: string;
}

export default function AdvancedEntryOptions<T extends FieldValues>({
  configuredSites,
  hasMultipleSites,
  spaces,
  control,
  ENTRY_FORM_LAYOUT,
  settings,
  selectedTypeCode,
}: AdvancedEntryOptionsProps<T>) {
  return (
    <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
      <div className="grid grid-cols-2 gap-3">
        {hasMultipleSites && (
          <Controller
            name="site"
            control={control}
            render={({ field }) => (
              <Select
                aria-label="Sede"
                value={field.value ? [field.value] : []}
                onChange={(keys: Set<string | number | boolean | null | undefined>) => {
                  const selected = Array.from(keys)[0] as string | undefined;
                  if (selected) field.onChange(selected);
                }}
              >
                <Select.Trigger aria-label="Seleccionar opción">
                  <Select.Value aria-label="Seleccionar opción" />
                  <Select.Indicator aria-label="Seleccionar opción" />
                </Select.Trigger>
                <Select.Popover aria-label="Seleccionar opción">
                  <ListBox>
                    {configuredSites.map((site: any) => {
                      const key = String(site.code ?? site.name ?? "PRINCIPAL");
                      return (
                        <ListBox.Item key={key} textValue={String(site.name ?? key)}>
                          {String(site.name ?? key)}
                        </ListBox.Item>
                      );
                    })}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />
        )}
        <Controller
          name="lane"
          control={control}
          render={({ field }) => <Input {...field} label="Carril" placeholder="1" size="sm" />}
        />
        <Controller
          name="booth"
          control={control}
          render={({ field }) => <Input {...field} label="Caja" placeholder="Caja 1" size="sm" />}
        />
        <Controller
          name="terminal"
          control={control}
          render={({ field }) => <Input {...field} label="Terminal" placeholder="T1" size="sm" />}
        />
      </div>

      <Controller
        name="countryCode"
        control={control}
        render={({ field }) => <Input {...field} label="País placa" placeholder="CO" size="sm" maxLength={2} />}
      />
      <Controller
        name="rateId"
        control={control}
        render={({ field }) => (
          <Input {...field} label="Tarifa (opcional)" placeholder="ID de tarifa específica" size="sm" />
        )}
      />

      <Controller
        name="parkingSpaceId"
        control={control}
        render={({ field: { value, onChange, ...field } }) => (
          <Select
            {...field}
            aria-label="Celda (opcional)"
            placeholder="Seleccionar celda..."
            selectedKey={value || null}
            onSelectionChange={(keys: any) => {
              const arr = Array.from((keys as any) || []);
              onChange(arr.length ? String(arr[0]) : "");
            }}
            size="sm"
          >
            <Select.Trigger aria-label="Seleccionar opción">
              <Select.Value aria-label="Seleccionar opción" />
              <Select.Indicator aria-label="Seleccionar opción" />
            </Select.Trigger>
            <Select.Popover aria-label="Seleccionar opción">
              <ListBox>
                {spaces.map((s: any) => (
                  <ListBox.Item key={s.id} textValue={`${s.code} ${s.label ? `(${s.label})` : ""}`}>
                    {s.code} {s.label ? `(${s.label})` : ""}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        )}
      />

      <FormLayoutFactory layout={ENTRY_FORM_LAYOUT} control={control} selectedVehicleType={selectedTypeCode} skipConditionCheck={settings.skipConditionCheck} />
    </div>
  );
}
