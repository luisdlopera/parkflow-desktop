"use client";

import { AlertTriangle, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/bridge/Input";
import { Switch } from "@/components/bridge/Switch";
import type { PricingBuilderErrors, PricingConfiguration, PricingRoundingMode } from "../lib/types";

export function PricingRulesPanel({
  config,
  errors,
  vehicleTypes,
  onChange,
}: {
  config: PricingConfiguration;
  errors: PricingBuilderErrors;
  vehicleTypes: string[];
  onChange: (config: PricingConfiguration) => void;
}) {
  const patchRules = (patch: Partial<PricingConfiguration["rules"]>) =>
    onChange({ ...config, rules: { ...config.rules, ...patch } });

  const patchAdvancedMode = (advancedMode: boolean) => onChange({ ...config, advancedMode });

  const patchOverride = (vehicleType: string, value: string) => {
    const next = { ...(config.rules.vehicleOverrides ?? {}) };
    if (value === "") {
      delete next[vehicleType];
    } else {
      next[vehicleType] = {
        ...(next[vehicleType] ?? {}),
        rates: { ...(next[vehicleType]?.rates ?? {}), pricePerHour: Number(value) },
      };
    }
    patchRules({ vehicleOverrides: next });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Input
          type="number"
          min={0}
          label="Minutos de cortesía"
          description="Tiempo inicial gratis antes de cobrar."
          value={String(config.rules.graceMinutes)}
          onChange={(event) => patchRules({ graceMinutes: Number(event.target.value || 0) })}
          isInvalid={Boolean(errors["rules.graceMinutes"])}
          errorMessage={errors["rules.graceMinutes"]}
        />
        <Input
          type="number"
          min={0}
          label="Mínimo de cobro"
          description="Minutos mínimos que se cobran."
          value={String(config.rules.minimumChargeMinutes)}
          onChange={(event) => patchRules({ minimumChargeMinutes: Number(event.target.value || 0) })}
          isInvalid={Boolean(errors["rules.minimumChargeMinutes"])}
          errorMessage={errors["rules.minimumChargeMinutes"]}
        />
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Redondeo</label>
          <div className="grid grid-cols-4 gap-1 rounded-lg border border-default-200 bg-content1 p-1">
            {(["NONE", "UP", "DOWN", "NEAREST"] as PricingRoundingMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => patchRules({ rounding: { ...config.rules.rounding, mode } })}
                className={`min-h-10 rounded-md text-xs font-semibold ${config.rules.rounding.mode === mode ? "bg-brand-500 text-white" : "text-default-600 hover:bg-default-100"}`}
              >
                {mode}
              </button>
            ))}
          </div>
          {config.rules.rounding.mode !== "NONE" ? (
            <Input
              type="number"
              min={1}
              aria-label="Minutos de redondeo"
              value={String(config.rules.rounding.incrementMinutes ?? "")}
              onChange={(event) => patchRules({ rounding: { ...config.rules.rounding, incrementMinutes: Number(event.target.value || 0) } })}
              isInvalid={Boolean(errors["rules.rounding.incrementMinutes"])}
              errorMessage={errors["rules.rounding.incrementMinutes"]}
            />
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-default-200 bg-content1 p-4">
        <Switch isSelected={config.advancedMode} onChange={patchAdvancedMode}>
          <span className="inline-flex items-center gap-2 font-semibold">
            <SlidersHorizontal className="h-4 w-4" />
            Modo avanzado
          </span>
        </Switch>
        <p className="mt-2 text-sm text-default-600">
          {config.advancedMode
            ? "Configuración compleja. Úsala si manejas horarios, fines de semana o reglas por vehículo."
            : "Configuración simple para la mayoría de parqueaderos."}
        </p>
      </div>

      {config.advancedMode ? (
        <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex gap-2 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
            <span>Revisa el simulador después de cada cambio avanzado para confirmar el impacto del precio.</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-content1 p-4">
              <Switch
                isSelected={Boolean(config.rules.specialHours?.enabled)}
                onChange={(enabled) => patchRules({ specialHours: { ...(config.rules.specialHours ?? { startTime: "20:00", endTime: "06:00" }), enabled } })}
              >
                Horario especial
              </Switch>
              {config.rules.specialHours?.enabled ? (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Input label="Inicio" value={config.rules.specialHours.startTime} onChange={(event) => patchRules({ specialHours: { ...config.rules.specialHours!, startTime: event.target.value } })} />
                  <Input label="Fin" value={config.rules.specialHours.endTime} onChange={(event) => patchRules({ specialHours: { ...config.rules.specialHours!, endTime: event.target.value } })} />
                </div>
              ) : null}
            </div>

            <div className="rounded-lg bg-content1 p-4">
              <Switch
                isSelected={Boolean(config.rules.dailyCaps?.enabled)}
                onChange={(enabled) => patchRules({ dailyCaps: { ...(config.rules.dailyCaps ?? {}), enabled } })}
              >
                Tope diario
              </Switch>
              {config.rules.dailyCaps?.enabled ? (
                <Input
                  className="mt-3"
                  type="number"
                  label="Máximo por día (COP)"
                  value={config.rules.dailyCaps.maxDailyPrice === undefined ? "" : String(config.rules.dailyCaps.maxDailyPrice)}
                  onChange={(event) => patchRules({ dailyCaps: { ...config.rules.dailyCaps!, maxDailyPrice: Number(event.target.value || 0) } })}
                  isInvalid={Boolean(errors["rules.dailyCaps.maxDailyPrice"])}
                  errorMessage={errors["rules.dailyCaps.maxDailyPrice"]}
                />
              ) : null}
            </div>
          </div>

          {vehicleTypes.length > 1 ? (
            <div className="rounded-lg bg-content1 p-4">
              <p className="text-sm font-semibold text-foreground">Overrides por vehículo</p>
              <p className="mt-1 text-xs text-default-600">Sobrescribe el valor por hora sin duplicar toda la tarifa.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {vehicleTypes.map((vehicleType) => (
                  <Input
                    key={vehicleType}
                    type="number"
                    label={vehicleType}
                    placeholder={config.rates.pricePerHour ? String(config.rates.pricePerHour) : "Sin override"}
                    value={config.rules.vehicleOverrides?.[vehicleType]?.rates?.pricePerHour === undefined ? "" : String(config.rules.vehicleOverrides?.[vehicleType]?.rates?.pricePerHour)}
                    onChange={(event) => patchOverride(vehicleType, event.target.value)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
