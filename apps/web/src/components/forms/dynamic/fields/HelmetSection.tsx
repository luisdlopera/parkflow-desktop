"use client";

import React, { useEffect, useState } from "react";
import { Controller, useFieldArray, Control } from "react-hook-form";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useRuntimeConfig } from "@/lib/useRuntimeConfig";
import { ListBox } from "@heroui/react";
import { fetchAvailableLockers } from "@/services/lockers.service";

interface HelmetSectionProps {
  control: Control<any>;
  selectedVehicleType: string;
}

export function HelmetSection({ control, selectedVehicleType }: HelmetSectionProps) {
  const { config } = useRuntimeConfig();

  const [availableTokens, setAvailableTokens] = useState<{ id: string; code: string }[]>([]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "custodiedItems",
  });

  const enableCustodiedItem = config?.operationConfiguration?.enableCustodiedItem ?? true;

  useEffect(() => {
    if (enableCustodiedItem && selectedVehicleType === "MOTORCYCLE") {
      fetchAvailableLockers()
        .then((lockers) => setAvailableTokens(lockers.map((l) => ({ id: l.id, code: l.code }))))
        .catch(() => setAvailableTokens([]));
    }
  }, [enableCustodiedItem, selectedVehicleType]);

  if (selectedVehicleType !== "MOTORCYCLE" || !enableCustodiedItem) {
    return null;
  }

  return (
    <>
      <div className="col-span-2 border-t border-slate-200/50 pt-3 mt-1 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Cascos en Custodia al Ingreso
          </p>
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((num) => (
              <Button
                key={num}
                size="sm"
                variant={fields.length === num ? "solid" : "bordered"}
                color={fields.length === num ? "primary" : "default"}
                onPress={() => {
                  const currentLen = fields.length;
                  if (num > currentLen) {
                    for (let i = 0; i < num - currentLen; i++) {
                      append({ identifier: "", observations: "", photoUrl: "" });
                    }
                  } else if (num < currentLen) {
                    for (let i = currentLen - 1; i >= num; i--) {
                      remove(i);
                    }
                  }
                }}
              >
                {num === 0 ? "Sin casco" : `${num} Casco${num > 1 ? "s" : ""}`}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800"
        >
          <div className="col-span-1 sm:col-span-3 flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Casco #{index + 1}
            </span>
          </div>
          <Controller
            name={`custodiedItems.${index}.identifier`}
            control={control}
            render={({ field: cField, fieldState }) => (
              <Select
                label="Número de Locker"
                placeholder={
                  availableTokens.length === 0 ? "Sin lockers disponibles" : "Seleccionar locker"
                }
                size="sm"
                isInvalid={!!fieldState.error}
                errorMessage={fieldState.error?.message}
                isRequired
                isDisabled={availableTokens.length === 0}
                selectedKeys={cField.value ? [cField.value] : []}
                onSelectionChange={(keys: any) => {
                  const val = Array.from(keys as Set<string>)[0] || "";
                  cField.onChange(val);
                }}
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {availableTokens.map((token) => (
                      <ListBox.Item key={token.code} textValue={token.code}>
                        {token.code}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />
          <Controller
            name={`custodiedItems.${index}.observations`}
            control={control}
            render={({ field: cField, fieldState }) => (
              <Input
                {...cField}
                label="Observaciones"
                placeholder="Marca, color, etc."
                size="sm"
                isInvalid={!!fieldState.error}
                errorMessage={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name={`custodiedItems.${index}.photoUrl`}
            control={control}
            render={({ field: cField, fieldState }) => (
              <Input
                {...cField}
                label="Foto del casco (URL)"
                placeholder="https://..."
                size="sm"
                isInvalid={!!fieldState.error}
                errorMessage={fieldState.error?.message}
              />
            )}
          />
        </div>
      ))}
    </>
  );
}
