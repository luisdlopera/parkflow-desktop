"use client";
import React from "react";
import { ListBox } from "@heroui/react";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import type { OperatorMode } from "@/features/vehicle-entry/hooks/useOperatorSettings";

export default function VehicleEntryHeader({
  stats,
  occupancy,
  settings,
  updateSettings,
  showSettings,
  setShowSettings,
}: any) {
  const modeOptions = [
    { key: "beginner", label: "Principiante" },
    { key: "expert", label: "Experto" },
    { key: "speed", label: "Velocidad" },
  ];

  const isSingleType = false;

  if (isSingleType) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="bg-brand-50 rounded-xl px-3 py-2">
          <span className="text-xs text-brand-600 font-medium whitespace-nowrap">Hoy: {stats.today}</span>
        </div>
        <div className="bg-slate-100 rounded-xl px-3 py-2">
          <span className="text-xs text-slate-600 font-medium whitespace-nowrap">Sesión: {stats.session}</span>
        </div>
        {occupancy && (
          <div className={`${occupancy.availableSpaces <= 0 ? "bg-rose-50 border border-rose-100" : "bg-primary-50 border border-primary-100"} rounded-xl px-3 py-2`}>
            <span className={`text-xs ${occupancy.availableSpaces <= 0 ? "text-rose-700 font-bold" : "text-primary-700 font-medium"} whitespace-nowrap`}>Disponibles: {occupancy.availableSpaces} / {occupancy.activeSpaces}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 whitespace-nowrap">Modo:</span>
        <Select
          aria-label="Modo de operación"
          value={[settings.mode]}
          onChange={(keys) => updateSettings({ mode: Array.from(keys)[0] as OperatorMode })}
          className="w-28 sm:w-32"
          classNames={{ trigger: "min-h-0 h-8" }}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {modeOptions.map((o) => (
                <ListBox.Item key={o.key} textValue={o.label}>{o.label}</ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Button isIconOnly size="sm" variant="tertiary" color="primary" aria-label="Configuración de operador" onPress={() => setShowSettings((v: boolean) => !v)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        </Button>
      </div>
    </div>
  );
}
