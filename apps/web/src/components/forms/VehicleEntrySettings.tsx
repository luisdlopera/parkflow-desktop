"use client";
import React from "react";
import { Card } from "@/components/bridge/Card";
import { Checkbox } from "@/components/bridge/Checkbox";
import { Select } from "@/components/bridge/Select";
import { ListBox } from "@heroui/react";
import { VehicleTypeIcon } from "@/components/vehicles/VehicleTypeIcon";

export default function VehicleEntrySettings({
  isSingleType,
  showSettings,
  settings,
  updateSettings,
  vehicleTypes,
}: any) {
  if (isSingleType) return null;
  if (!showSettings) return null;

  const vehicleTypeView = (t: any) => ({ label: t.name || t.code, color: t.color || "" });

  return (
    <Card className="bg-default-50 dark:bg-default-900">
      <Card.Content className="p-4 space-y-3">
        <h4 className="text-sm font-semibold text-default-700 dark:text-default-300">Configuración de Operador</h4>
        <div className="flex flex-wrap gap-4">
          <Checkbox isSelected={settings.rememberLocation} onChange={(checked: any) => updateSettings({ rememberLocation: checked })} size="sm">Recordar ubicación</Checkbox>
          <Checkbox isSelected={settings.skipConditionCheck} onChange={(checked: any) => updateSettings({ skipConditionCheck: checked })} size="sm">Omitir estado vehículo</Checkbox>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-default-600 dark:text-default-400">Tipo por defecto:</label>
          <Select
            aria-label="Tipo de vehículo por defecto"
            value={vehicleTypes.some((t: any) => t.code === settings.defaultVehicleType) ? [settings.defaultVehicleType] : []}
            onChange={(val: Set<string | number | boolean>) => {
              const selected = Array.from(val)[0];
              if (selected) updateSettings({ defaultVehicleType: String(selected) });
            }}
            className="w-40"
          >
            <Select.Trigger aria-label="Seleccionar opción">
              <Select.Value aria-label="Seleccionar opción" />
              <Select.Indicator aria-label="Seleccionar opción" />
            </Select.Trigger>
            <Select.Popover aria-label="Seleccionar opción">
              <ListBox>
                {vehicleTypes.map((t: any) => {
                  const config = vehicleTypeView(t);
                  return (
                    <ListBox.Item key={t.code} textValue={config.label}>
                      <VehicleTypeIcon code={t.code} className="inline w-4 h-4 mr-1" size={16} /> {config.label}
                    </ListBox.Item>
                  );
                })}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </Card.Content>
    </Card>
  );
}
