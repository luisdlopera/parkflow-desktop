"use client";

import { Switch, Description, Tooltip } from "@heroui/react";
import React from "react";

interface FeatureFlagSwitchProps {
  label: string;
  description: string;
  tooltip: string;
  isSelected: boolean;
  isDisabled?: boolean;
  onChange: (isSelected: boolean) => void;
}

export function FeatureFlagSwitch({
  label,
  description,
  tooltip,
  isSelected,
  isDisabled = false,
  onChange,
}: FeatureFlagSwitchProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900">{label}</span>
          <Tooltip delay={0}>
            <Tooltip.Trigger aria-label="Más información">
              <span className="inline-flex size-4 cursor-help items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-300">
                ?
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content showArrow placement="top">
              <Tooltip.Arrow />
              <p className="max-w-xs text-xs">{tooltip}</p>
            </Tooltip.Content>
          </Tooltip>
        </div>
        <Description className="text-xs text-slate-500">{description}</Description>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-medium ${
            isSelected ? "text-emerald-600" : "text-slate-400"
          }`}
        >
          {isSelected ? "Activo" : "Inactivo"}
        </span>
        <Switch
          isSelected={isSelected}
          onChange={onChange}
          isDisabled={isDisabled}
          size="sm"
          aria-label={label}
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
      </div>
    </div>
  );
}
