"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/bridge/Button";
import { Switch } from "@/components/bridge/Switch";
import { Card } from "@/components/bridge/Card";
import { Badge } from "@/components/bridge/Badge";
import { Alert } from "@/components/bridge/Alert";
import {
  fetchOnboardingQuestions,
  batchSaveOnboardingQuestions,
  seedOnboardingQuestions,
  type OnboardingQuestionConfig,
} from "@/lib/api/admin-onboarding.api";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import { HelpCircle, Save, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";

export default function AdminOnboardingPage() {
  const [questions, setQuestions] = useState<OnboardingQuestionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchOnboardingQuestions();
      setQuestions(data);
      setHasChanges(false);
    } catch (err: unknown) {
      const msg = getUserFriendlyErrorMessage(err, FrontendActionError.LOAD_DATA);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleToggle = (stepNumber: number, field: "enabled" | "required", value: boolean) => {
    setQuestions((prev) =>
      prev.map((q) => (q.stepNumber === stepNumber ? { ...q, [field]: value } : q))
    );
    setHasChanges(true);
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await batchSaveOnboardingQuestions(questions);
      setSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  const handleSeed = async () => {
    setLoading(true);
    setError("");
    try {
      await seedOnboardingQuestions();
      await loadQuestions();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Error al inicializar configuración");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Gestión de Onboarding</h1>
        <p className="text-default-500">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Onboarding</h1>
          <p className="text-default-500">
            Administra globalmente las preguntas del onboarding. Los cambios afectan a todas las empresas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="tertiary"
            startContent={<RefreshCw className="w-4 h-4" />}
            onPress={handleSeed}
            isLoading={loading}
          >
            Restaurar Defaults
          </Button>
          <Button
            color="primary"
            startContent={<Save className="w-4 h-4" />}
            onPress={handleSave}
            isLoading={saving}
            isDisabled={!hasChanges}
          >
            Guardar Cambios
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert color="danger" variant="solid">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        </Alert>
      )}
      {success && (
        <Alert color="success" variant="solid">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Configuración guardada exitosamente
          </div>
        </Alert>
      )}
      {hasChanges && (
        <Alert color="warning">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Tienes cambios pendientes. Guarda para aplicarlos.
          </div>
        </Alert>
      )}

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="flex items-center gap-2 bg-default-50 p-3 rounded-lg">
          <Badge color="primary" variant="soft">Obligatoria</Badge>
          <span className="text-default-600">El usuario debe responder antes de omitir.</span>
        </div>
        <div className="flex items-center gap-2 bg-default-50 p-3 rounded-lg">
          <Badge color="warning" variant="soft">Por plan</Badge>
          <span className="text-default-600">Solo visible si el plan lo incluye.</span>
        </div>
        <div className="flex items-center gap-2 bg-default-50 p-3 rounded-lg">
          <Badge color="success" variant="soft">Habilitada</Badge>
          <span className="text-default-600">Se muestra en el wizard.</span>
        </div>
      </div>

      {/* Questions list */}
      <div className="space-y-3">
        {questions.map((q) => (
          <Card key={q.stepNumber} className={q.enabled ? "" : "opacity-60"}>
            <Card.Content className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-200 dark:bg-brand-900/40 text-brand flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {q.stepNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{q.title}</h3>
                      {q.required && (
                        <Badge color="danger" variant="soft" size="sm">
                          Obligatoria
                        </Badge>
                      )}
                      {q.planRestricted && (
                        <Badge color="warning" variant="soft" size="sm">
                          Por plan
                        </Badge>
                      )}
                      {!q.enabled && (
                        <Badge color="default" variant="soft" size="sm">
                          Deshabilitada
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-default-500 mt-1">{q.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Switch
                      isSelected={q.enabled}
                      onChange={(v) => handleToggle(q.stepNumber, "enabled", v)} aria-label="Alternar opción"
                    />
                    <span className="text-sm text-default-600">{q.enabled ? "Habilitada" : "Deshabilitada"}</span>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>

      {questions.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <HelpCircle className="w-12 h-12 text-default-300 mx-auto" />
          <p className="text-default-500">No hay preguntas configuradas. Presiona "Restaurar Defaults" para inicializar.</p>
        </div>
      )}
    </div>
  );
}
