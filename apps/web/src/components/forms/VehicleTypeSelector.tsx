"use client";
import React from "react";
import { ListBox } from "@heroui/react";
import { Select } from "@/components/bridge/Select";
import { Controller } from "react-hook-form";
import { VehicleTypeIcon } from "@/components/vehicles/VehicleTypeIcon";

import { Control, UseFormSetValue, UseFormTrigger } from "react-hook-form";

export interface VehicleTypeData {
  code: string;
  name?: string;
  color?: string;
}

export interface VehicleTypeSelectorProps {
  vehicleTypes: VehicleTypeData[];
  loadingTypes?: boolean;
  isExpert?: boolean;
  visibleQuickTypes: VehicleTypeData[];
  selectedTypeCode?: string;
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  trigger: UseFormTrigger<any>;
}

export default function VehicleTypeSelector({
  vehicleTypes,
  loadingTypes,
  isExpert,
  visibleQuickTypes,
  selectedTypeCode,
  control,
  setValue,
  trigger,
}: VehicleTypeSelectorProps) {
  if (vehicleTypes.length === 1) return null;

  if (loadingTypes) {
    return <div className="h-10 w-full bg-slate-100 dark:bg-slate-700 animate-pulse rounded-lg" />;
  }

    if (isExpert) {
      return (
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
        {visibleQuickTypes.map((t: VehicleTypeData, index: number) => {
          const config = { label: t.name || t.code, color: t.color || "" };
          const isSelected = selectedTypeCode === t.code;
          return (
            <button
              key={t.code}
              type="button"
                onClick={() => {
                setValue("type", t.code, { shouldValidate: true, shouldDirty: true });
                void trigger("plate");
              }}
              className={`relative rounded-xl p-2 sm:p-3 text-center transition-all ${
                isSelected
                  ? "text-white border border-default-200 scale-105"
                  : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
              }`}
              style={isSelected && config.color ? { backgroundColor: config.color } : undefined}
            >
              <div className="text-xl sm:text-2xl mb-1">
                <VehicleTypeIcon code={t.code} className="mx-auto w-6 h-6" />
              </div>
              <div className="text-xs font-medium">{config.label}</div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400 dark:text-slate-500 border border-default-200 dark:border-slate-600">
                {index + 1}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
                <Controller
      name="type"
      control={control}
      render={({ field }) => {
        const validKeys = vehicleTypes.map((t: VehicleTypeData) => t.code);
        const selectedKey = validKeys.includes(field.value) ? field.value : undefined;
        return (
          <Select
            name="type"
            aria-label="Tipo de vehículo"
            data-testid="vehicle-type"
            value={selectedKey ? [selectedKey] : []}
            isDisabled={vehicleTypes.length === 0 || loadingTypes}
            onChange={(keys: Set<string | number | boolean | null | undefined>) => {
              const selected = Array.from(keys as Iterable<string | number>)[0] as string;
              field.onChange(selected);
              void trigger("plate");
            }}
          >
            <Select.Trigger aria-label="Seleccionar opción">
              <Select.Value aria-label="Seleccionar opción" />
              <Select.Indicator aria-label="Seleccionar opción" />
            </Select.Trigger>
            <Select.Popover aria-label="Seleccionar opción">
              <ListBox>
                {vehicleTypes.map((t: VehicleTypeData) => {
                  const config = { label: t.name || t.code, color: t.color || "" };
                  return (
                    <ListBox.Item key={t.code} id={t.code} textValue={config.label}>
                      <VehicleTypeIcon code={t.code} size={16} className="inline w-4 h-4 mr-1" /> {config.label}
                    </ListBox.Item>
                  );
                })}
              </ListBox>
            </Select.Popover>
          </Select>
        );
      }}
    />
  );
}
