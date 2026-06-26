"use client";

import React, { useState } from "react";
import { Separator } from "@heroui/react";
import { Button } from "@/components/bridge/Button";
import { Input } from "@/components/bridge/Input";
import { TextArea } from "@/components/bridge/TextArea";
import { Switch } from "@/components/bridge/Switch";
import { Alert } from "@/components/bridge/Alert";
import type { Plan, PlanFeatures, CreatePlanRequest } from "@/lib/plans/types";
import {
  FEATURE_CATEGORIES,
  FEATURE_CATEGORY_LABELS,
  DEFAULT_FEATURES,
} from "@/lib/plans/types";
import { toast } from "@heroui/react";

interface PlanFormProps {
  onSubmit: (data: CreatePlanRequest) => Promise<void>;
  isLoading?: boolean;
  initialData?: Plan | null;
}

function validateForm(data: CreatePlanRequest): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.name.trim()) {
    errors.name = "El nombre del plan es obligatorio";
  }
  if (data.monthlyPrice < 0) {
    errors.monthlyPrice = "El precio mensual no puede ser negativo";
  }
  if (data.yearlyPrice < 0) {
    errors.yearlyPrice = "El precio anual no puede ser negativo";
  }
  return errors;
}

function countEnabledFeatures(features: PlanFeatures): number {
  return Object.values(features).filter(Boolean).length;
}

export function PlanForm({ onSubmit, isLoading, initialData }: PlanFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [monthlyPrice, setMonthlyPrice] = useState(
    initialData?.monthlyPrice ?? 0
  );
  const [yearlyPrice, setYearlyPrice] = useState(initialData?.yearlyPrice ?? 0);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [features, setFeatures] = useState<PlanFeatures>(
    initialData?.features || { ...DEFAULT_FEATURES }
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const enabledCount = countEnabledFeatures(features);
  const totalFeatures = Object.keys(DEFAULT_FEATURES).length;

  const toggleFeature = (key: keyof PlanFeatures) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setAll = (value: boolean) => {
    const updated = {} as PlanFeatures;
    for (const k of Object.keys(DEFAULT_FEATURES) as (keyof PlanFeatures)[]) {
      updated[k] = value;
    }
    setFeatures(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const data: CreatePlanRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      monthlyPrice,
      yearlyPrice,
      isActive,
      features,
    };

    const errors = validateForm(data);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      await onSubmit(data);
    } catch (err: unknown) {
      const error = err as { message?: string };
      const msg = error?.message || "Error al guardar el plan. Intente nuevamente.";
      setSubmitError(msg);
      toast.danger(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {submitError && (
        <Alert color="danger">
          {submitError}
        </Alert>
      )}

      {/* Section 1: Basic Info */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Datos básicos</h2>

        <Input
          label="Nombre del plan"
          placeholder="Ej: Plan Premium"
          value={name}
          onValueChange={(v) => {
            setName(v);
            setFieldErrors((p) => ({ ...p, name: "" }));
          }}
          isInvalid={!!fieldErrors.name}
          errorMessage={fieldErrors.name}
          isRequired
        />

        <TextArea
          label="Descripción"
          placeholder="Descripción del plan y sus beneficios"
          value={description}
          onValueChange={setDescription}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Precio mensual"
            placeholder="0.00"
            type="number"
            startContent={
              <span className="text-default-400 text-small">$</span>
            }
            value={String(monthlyPrice)}
            onValueChange={(v) => {
              setMonthlyPrice(Number(v) || 0);
              setFieldErrors((p) => ({ ...p, monthlyPrice: "" }));
            }}
            isInvalid={!!fieldErrors.monthlyPrice}
            errorMessage={fieldErrors.monthlyPrice}
          />
          <Input
            label="Precio anual"
            placeholder="0.00"
            type="number"
            startContent={
              <span className="text-default-400 text-small">$</span>
            }
            value={String(yearlyPrice)}
            onValueChange={(v) => {
              setYearlyPrice(Number(v) || 0);
              setFieldErrors((p) => ({ ...p, yearlyPrice: "" }));
            }}
            isInvalid={!!fieldErrors.yearlyPrice}
            errorMessage={fieldErrors.yearlyPrice}
          />
        </div>

        <Switch isSelected={isActive} onValueChange={setIsActive} aria-label="Alternar opción">
          Plan activo
        </Switch>
      </section>

      <Separator className="my-2" />

      {/* Section 2: Feature Flags */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Features del plan</h2>
            <p className="text-sm text-default-500">
              {enabledCount} de {totalFeatures} funcionalidades activas
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="flat"
              size="sm"
              onPress={() => setAll(true)}
            >
              Activar todas
            </Button>
            <Button
              variant="flat"
              size="sm"
              onPress={() => setAll(false)}
            >
              Desactivar todas
            </Button>
          </div>
        </div>

        {enabledCount === 0 && (
          <Alert color="warning">
            Este plan no tiene funcionalidades activas. Los usuarios asignados
            no podrán acceder a ningún módulo del sistema.
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(FEATURE_CATEGORIES).map(([categoryKey, items]) => (
            <div
              key={categoryKey}
              className="border border-slate-200 rounded-xl p-4 space-y-3"
            >
              <h3 className="text-sm font-semibold text-default-600 uppercase tracking-wider">
                {FEATURE_CATEGORY_LABELS[categoryKey]}
              </h3>
              <div className="space-y-3">
                {items.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <label
                      htmlFor={`feature-${key}`}
                      className="text-sm cursor-pointer"
                    >
                      {label}
                    </label>
                    <Switch
                      id={`feature-${key}`}
                      isSelected={features[key]}
                      onValueChange={() => toggleFeature(key)}
                      size="sm" aria-label="Alternar opción"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button
          type="submit"
          color="primary"
          isLoading={isLoading}
        >
          {initialData ? "Guardar cambios" : "Crear plan"}
        </Button>
      </div>
    </form>
  );
}
