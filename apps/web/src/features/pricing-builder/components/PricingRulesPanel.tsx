"use client";

import { AlertTriangle, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/bridge/Input";
import { Switch } from "@/components/bridge/Switch";
import { PRICING_RULE_EXECUTION_ORDER, PRICING_RULE_LABELS } from "../lib/constants";
import { ROUNDING_HELP, ROUNDING_LABELS } from "../lib/display";
import type { PricingBuilderErrors, PricingConfiguration, PricingRoundingMode } from "../lib/types";
import { InlineHelp } from "./InlineHelp";
import { VehicleOverridesPanel } from "./VehicleOverridesPanel";

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

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-default-200 bg-content1 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span>Orden de cálculo</span>
          <InlineHelp title="¿Qué significa este orden?">
            Las reglas se aplican en esta secuencia para que el cobro sea predecible. Primero se descuenta la cortesía, luego se respeta el mínimo de cobro, después se redondea, se calcula la tarifa y al final se aplica el tope diario si existe.
          </InlineHelp>
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          {PRICING_RULE_EXECUTION_ORDER.map((rule, index) => (
            <div key={rule} className="rounded-md border border-default-200 bg-default-50 px-3 py-2 text-center dark:bg-zinc-900/40">
              <span className="text-[11px] font-semibold text-default-500">{index + 1}</span>
              <p className="text-xs font-semibold text-foreground">{PRICING_RULE_LABELS[rule]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          id="rules.graceMinutes"
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
          id="rules.minimumChargeMinutes"
          type="number"
          min={0}
          label={
            <span>
              Mínimo de cobro
              <InlineHelp title="¿Para qué sirve?">
                Define el tiempo mínimo que se cobrará aunque el vehículo permanezca menos. Ejemplo: si el mínimo es 60 minutos y la estancia cobrable es 20 minutos, se cobra como 1 hora.
              </InlineHelp>
            </span>
          }
          description="Úsalo cuando siempre cobras al menos una base mínima."
          value={String(config.rules.minimumChargeMinutes)}
          onChange={(event) => patchRules({ minimumChargeMinutes: Number(event.target.value || 0) })}
          isInvalid={Boolean(errors["rules.minimumChargeMinutes"])}
          errorMessage={errors["rules.minimumChargeMinutes"]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)]">
        <div id="rules.rounding" className="space-y-3 rounded-lg border border-default-200 bg-content1 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span>Redondeo</span>
            <InlineHelp title="Cómo se redondea">
              Controla cómo se ajustan los minutos después de aplicar cortesía y mínimo de cobro. Elige la opción según tu política comercial.
            </InlineHelp>
          </label>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {(["NONE", "UP", "DOWN", "NEAREST"] as PricingRoundingMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => patchRules({ rounding: { ...config.rules.rounding, mode } })}
                className={`min-h-[92px] rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                  config.rules.rounding.mode === mode
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                    : "border-default-200 text-default-600 hover:border-brand-300"
                }`}
              >
                <span className="block text-sm font-semibold leading-5">{ROUNDING_LABELS[mode]}</span>
                <span className="mt-1 block leading-4 text-default-500">{ROUNDING_HELP[mode]}</span>
              </button>
            ))}
          </div>
          {config.rules.rounding.mode !== "NONE" ? (
            <Input
              id="rules.rounding.incrementMinutes"
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
                  <Input id="rules.specialHours.startTime" label="Inicio (24 horas)" description="Formato 24 horas, ejemplo 20:00." value={config.rules.specialHours.startTime} onChange={(event) => patchRules({ specialHours: { ...config.rules.specialHours!, startTime: event.target.value } })} />
                  <Input id="rules.specialHours.endTime" label="Fin (24 horas)" description="Formato 24 horas, ejemplo 06:00." value={config.rules.specialHours.endTime} onChange={(event) => patchRules({ specialHours: { ...config.rules.specialHours!, endTime: event.target.value } })} />
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
                  id="rules.dailyCaps.maxDailyPrice"
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

          <VehicleOverridesPanel config={config} vehicleTypes={vehicleTypes} onChange={onChange} />
        </div>
      ) : null}
    </div>
  );
}
