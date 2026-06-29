"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Spinner, Chip } from "@heroui/react";
import { Card } from "@/components/bridge/Card";
import { FeatureFlagSwitch } from "./FeatureFlagSwitch";
import {
  fetchFeatureConfiguration,
  updateFeatureConfiguration,
  FEATURES_LIST,
  CATEGORY_LABELS,
  type FeatureConfig,
} from "@/lib/api/features-api";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";

interface FeatureFlagsSectionProps {
  onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void;
}

export function FeatureFlagsSection({ onNotify }: FeatureFlagsSectionProps) {
  const [config, setConfig] = useState<FeatureConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFeatureConfiguration()
      .then((data) => {
        if (!cancelled) setConfig(data);
      })
      .catch((e) => {
        if (!cancelled) {
          onNotify({
            kind: "err",
            text: getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onNotify]);

  const handleToggle = useCallback(
    async (key: keyof FeatureConfig, value: boolean) => {
      if (!config) return;
      setSaving(key);
      try {
        const updated = await updateFeatureConfiguration({ [key]: value });
        setConfig((prev) => (prev ? { ...prev, ...updated } : updated));
        window.dispatchEvent(new CustomEvent("parkflow-refresh-runtime-config"));
        onNotify({ kind: "ok", text: "Configuración guardada exitosamente" });
      } catch (e) {
        onNotify({
          kind: "err",
          text: getUserFriendlyErrorMessage(e, FrontendActionError.SAVE_DATA),
        });
      } finally {
        setSaving(null);
      }
    },
    [config, onNotify]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-default-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-default-200" />
                <div className="h-3 w-64 rounded bg-default-100" />
              </div>
              <div className="h-6 w-20 rounded-full bg-default-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!config) {
    return (
      <Card className="border-rose-200 bg-rose-50 p-4">
        <p className="text-sm text-rose-900">
          No se pudo cargar la configuración de características. Verifica la conexión con el servidor.
        </p>
      </Card>
    );
  }

  const groupedFeatures = FEATURES_LIST.reduce((acc, feature) => {
    const cat = feature.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(feature);
    return acc;
  }, {} as Record<string, typeof FEATURES_LIST>);

  const enabledCount = FEATURES_LIST.filter((f) => Boolean(config[f.key])).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-default-500">
            Características del Negocio
          </p>
          <p className="text-sm text-default-600">
            Habilita o deshabilita las funcionalidades del sistema según el modelo de negocio
          </p>
        </div>
        <Chip
          variant="primary"
          color="accent"
          size="sm"
        >
          {enabledCount} de {FEATURES_LIST.length} activas
        </Chip>
      </div>

      {Object.entries(groupedFeatures).map(([category, features]) => {
        const catInfo = CATEGORY_LABELS[category];
        return (
          <div key={category} className="space-y-3">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                {catInfo?.label ?? category}
              </h3>
              {catInfo && (
                <p className="text-xs text-default-500">{catInfo.description}</p>
              )}
            </div>
            <div className="space-y-2">
              {features.map((feature) => (
                <FeatureFlagSwitch
                  key={feature.key}
                  label={feature.label}
                  description={feature.description}
                  tooltip={feature.tooltip}
                  isSelected={Boolean(config[feature.key])}
                  isDisabled={saving === feature.key}
                  onChange={(value) => handleToggle(feature.key, value)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
