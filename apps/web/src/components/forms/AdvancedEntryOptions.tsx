"use client";
import React from "react";
import { Controller } from "react-hook-form";
import { ListBox } from "@heroui/react";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { FormLayoutFactory } from "@/components/forms/dynamic/FormLayoutFactory";

export default function AdvancedEntryOptions({
  configuredSites,
  hasMultipleSites,
  spaces,
  control,
  ENTRY_FORM_LAYOUT,
  settings,
  selectedTypeCode,
}: any) {
  return (
    <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
      <div className="grid grid-cols-2 gap-3">
        {hasMultipleSites && (
          <Controller
            name="site"
            control={control as any}
            render={({ field }) => (
              <Select
                aria-label="Sede"
                value={field.value ? [field.value] : []}
                onChange={(keys) => {
                  const selected = Array.from(keys)[0] as string | undefined;
                  if (selected) field.onChange(selected);
                }}
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
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
          control={control as any}
          render={({ field }) => <Input {...field} label="Carril" placeholder="1" size="sm" />}
        />
        <Controller
          name="booth"
          control={form.control as any}
          render={({ field }) => <Input {...field} label="Caja" placeholder="Caja 1" size="sm" />}
        />
        <Controller
          name="terminal"
          control={form.control as any}
          render={({ field }) => <Input {...field} label="Terminal" placeholder="T1" size="sm" />}
        />
      </div>

      <Controller
        name="countryCode"
        control={control as any}
        render={({ field }) => <Input {...field} label="País placa" placeholder="CO" size="sm" maxLength={2} />}
      />
      <Controller
        name="rateId"
        control={control as any}
        render={({ field }) => (
          <Input {...field} label="Tarifa (opcional)" placeholder="ID de tarifa específica" size="sm" />
        )}
      />

      <Controller
        name="parkingSpaceId"
        control={control as any}
        render={({ field: { value, onChange, ...field } }) => (
          <Select
            {...field}
            aria-label="Celda (opcional)"
            placeholder="Seleccionar celda..."
            selectedKey={value || null}
            onSelectionChange={(keys) => {
              const arr = Array.from((keys as any) || []);
              onChange(arr.length ? String(arr[0]) : "");
            }}
            size="sm"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
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

      <FormLayoutFactory layout={ENTRY_FORM_LAYOUT} control={form.control as any} selectedVehicleType={selectedTypeCode} skipConditionCheck={settings.skipConditionCheck} />
    </div>
  );
}
