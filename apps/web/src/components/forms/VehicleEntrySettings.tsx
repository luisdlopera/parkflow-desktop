"use client";
import React from "react";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select } from "@/components/ui/Select";
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
    <Card className="bg-slate-50">
      <Card.Content className="p-4 space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">Configuración de Operador</h4>
        <div className="flex flex-wrap gap-4">
          <Checkbox isSelected={settings.rememberLocation} onChange={(checked: any) => updateSettings({ rememberLocation: checked })} size="sm">Recordar ubicación</Checkbox>
          <Checkbox isSelected={settings.skipConditionCheck} onChange={(checked: any) => updateSettings({ skipConditionCheck: checked })} size="sm">Omitir estado vehículo</Checkbox>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Tipo por defecto:</label>
          <Select
            aria-label="Tipo de vehículo por defecto"
            value={vehicleTypes.some((t: any) => t.code === settings.defaultVehicleType) ? [settings.defaultVehicleType] : []}
            onChange={(val) => {
              const selected = val as any;
              if (selected) updateSettings({ defaultVehicleType: selected });
            }}
            className="w-40"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
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
