"use client";

import { GitBranch, RotateCcw } from "lucide-react";
import { Input } from "@/components/bridge/Input";
import { Switch } from "@/components/bridge/Switch";
import { resolvePricingConfiguration } from "../lib/engine/resolve-config";
import { formatMoney } from "../lib/engine/format";
import { labelVehicle } from "../lib/display";
import type { PricingConfiguration } from "../lib/types";

export function VehicleOverridesPanel({
  config,
  vehicleTypes,
  onChange,
}: {
  config: PricingConfiguration;
  vehicleTypes: string[];
  onChange: (config: PricingConfiguration) => void;
}) {
  const patchOverride = (vehicleType: string, patch: Record<string, unknown>) => {
    const current = config.rules.vehicleOverrides?.[vehicleType] ?? { inheritsBase: true };
    const next = {
      ...(config.rules.vehicleOverrides ?? {}),
      [vehicleType]: { ...current, ...patch },
    };
    onChange({ ...config, rules: { ...config.rules, vehicleOverrides: next } });
  };

  const patchRate = (vehicleType: string, key: "pricePerHour" | "dailyPrice", value: string) => {
    const current = config.rules.vehicleOverrides?.[vehicleType] ?? { inheritsBase: true };
    const rates = { ...(current.rates ?? {}) };
    if (value === "") delete rates[key];
    else rates[key] = Number(value);
    patchOverride(vehicleType, { rates });
  };

  if (vehicleTypes.length <= 1) return null;

  return (
    <div className="rounded-lg bg-content1 p-4">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-default-100 text-default-700">
          <GitBranch className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Ajustes por tipo de vehículo</p>
          <p className="mt-1 text-xs text-default-600">Cada vehículo hereda la configuración base y solo muestra lo que cambia.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        {vehicleTypes.map((vehicleType) => {
          const override = config.rules.vehicleOverrides?.[vehicleType];
          const resolved = resolvePricingConfiguration(config, { vehicleType });
          return (
            <div key={vehicleType} className="rounded-lg border border-default-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{labelVehicle(vehicleType)}</p>
                  <p className="mt-1 text-xs text-default-500">
                    {resolved.overrideApplied ? `${resolved.overrideDiff.length} cambio(s) sobre la base` : "Hereda tarifa base"}
                  </p>
                </div>
                <Switch
                  isSelected={override?.inheritsBase !== false}
                  onChange={(inheritsBase) => patchOverride(vehicleType, { inheritsBase })}
                >
                  Heredar tarifa base
                </Switch>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Input
                  type="number"
                  label="Valor por hora propio"
                  placeholder={config.rates.pricePerHour ? String(config.rates.pricePerHour) : "Sin ajuste propio"}
                  value={override?.rates?.pricePerHour === undefined ? "" : String(override.rates.pricePerHour)}
                  onChange={(event) => patchRate(vehicleType, "pricePerHour", event.target.value)}
                />
                <Input
                  type="number"
                  label="Tarifa diaria propia"
                  placeholder={config.rates.dailyPrice ? String(config.rates.dailyPrice) : "Sin ajuste propio"}
                  value={override?.rates?.dailyPrice === undefined ? "" : String(override.rates.dailyPrice)}
                  onChange={(event) => patchRate(vehicleType, "dailyPrice", event.target.value)}
                />
              </div>

              <div className="mt-3 rounded-md bg-default-50 p-3 dark:bg-zinc-900/50">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-default-600">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Resumen de herencia
                </div>
                {resolved.overrideDiff.length === 0 ? (
                  <p className="text-xs text-default-500">Hereda tarifa base sin cambios.</p>
                ) : (
                  <div className="space-y-1">
                    {resolved.overrideDiff.map((diff) => (
                      <p key={diff.path} className="text-xs text-default-600">
                        Cambia {diff.label} de <span className="font-semibold">{formatDisplay(diff.baseValue)}</span> a{" "}
                        <span className="font-semibold">{formatDisplay(diff.overrideValue)}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDisplay(value: string) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 1000) return formatMoney(numeric);
  return value;
}
