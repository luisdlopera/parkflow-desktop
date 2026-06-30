"use client";

import { Input } from "@/components/bridge/Input";
import { strategyFieldMap } from "../lib/constants";
import type { PricingBuilderErrors, PricingConfiguration, PricingRates } from "../lib/types";

const fieldMeta: Record<keyof PricingRates, { label: string; description: string }> = {
  pricePerHour: { label: "Valor por hora (COP)", description: "Lo que se cobra por cada hora o bloque redondeado." },
  fractionMinutes: { label: "Minutos por fracción", description: "Tamaño del bloque que vas a cobrar." },
  fractionPrice: { label: "Valor por fracción (COP)", description: "Precio de cada bloque de fracción." },
  dailyPrice: { label: "Tarifa diaria (COP)", description: "Valor máximo o fijo para un día." },
  nightPrice: { label: "Tarifa nocturna (COP)", description: "Valor usado en el horario nocturno." },
  mixed: { label: "Mixta", description: "" },
};

export function PricingRatesForm({
  config,
  errors,
  onChange,
}: {
  config: PricingConfiguration;
  errors: PricingBuilderErrors;
  onChange: (config: PricingConfiguration) => void;
}) {
  const visibleFields = strategyFieldMap[config.strategy.type];

  const setRate = (key: keyof PricingRates, value: string) => {
    onChange({
      ...config,
      rates: {
        ...config.rates,
        [key]: value === "" ? undefined : Number(value),
      },
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Input
        label="Nombre de la tarifa"
        value={config.name}
        onChange={(event) => onChange({ ...config, name: event.target.value })}
        isInvalid={Boolean(errors.name)}
        errorMessage={errors.name}
      />
      {visibleFields.map((field) => (
        <Input
          key={field}
          type="number"
          min={field === "fractionMinutes" ? 1 : 0}
          step={field === "fractionMinutes" ? 1 : 100}
          label={fieldMeta[field].label}
          description={fieldMeta[field].description}
          value={config.rates[field] === undefined ? "" : String(config.rates[field])}
          onChange={(event) => setRate(field, event.target.value)}
          isInvalid={Boolean(errors[`rates.${field}`] || (field === "fractionPrice" && errors["rates.fractionPrice"]) || errors.rates)}
          errorMessage={errors[`rates.${field}`] || (field === "fractionPrice" ? errors["rates.fractionPrice"] : undefined) || errors.rates}
        />
      ))}
    </div>
  );
}
