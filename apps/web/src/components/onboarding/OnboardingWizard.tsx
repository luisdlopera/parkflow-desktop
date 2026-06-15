"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Check, Save, AlertTriangle } from "lucide-react";
import { skipOnboarding, completeOnboarding } from "@/lib/onboarding-api";
import { createBatchHelmetLockers } from "@/services/helmet-lockers.service";
import { patchSessionUser } from "@/lib/auth";
import { useState } from "react";
import { 
  OnboardingProvider, 
  useOnboarding, 
  STEP_TITLES, 
  REQUIRED_STEPS, 
  isStepCompleted, 
  getPrevEnabledStep, 
  getNextEnabledStep,
  validateStep,
  type StepValidationErrors
} from "./OnboardingContext";

import Step1VehicleTypes from "./steps/Step1VehicleTypes";
import Step2Capacity from "./steps/Step2Capacity";
import Step3Rates from "./steps/Step3Rates";
import Step4BoxAndRegion from "./steps/Step4BoxAndRegion";
import Step5Shifts from "./steps/Step5Shifts";
import Step6PaymentMethods from "./steps/Step6PaymentMethods";
import Step7Tickets from "./steps/Step7Tickets";
import Step8Clients from "./steps/Step8Clients";
import Step9Agreements from "./steps/Step9Agreements";
import Step10Sites from "./steps/Step10Sites";
import Step11Permissions from "./steps/Step11Permissions";
import Step12Audit from "./steps/Step12Audit";

function OnboardingContent() {
  const { 
    companyId, 
    status, 
    loading, 
    saveState, 
    setSaveState,
    step, 
    enabledSteps, 
    totalEnabledSteps, 
    persistStep, 
    requiredCompleted,
    vehicleTypes,
    stepData,
    progress,
    onDone,
    stepErrors,
    validateCurrentStep,
    clearStepErrors,
    allProgressData
  } = useOnboarding();

  const currentVehicleTypes = step === 1
    ? (Array.isArray(stepData.vehicleTypes) ? (stepData.vehicleTypes as string[]) : [])
    : vehicleTypes;

  const currentValidation = validateStep(step, stepData, currentVehicleTypes);
  const canAdvance = currentValidation.isValid;

  const [showSkipModal, setShowSkipModal] = useState(false);

  if (loading || !status) return <div className="fixed inset-0 z-[120] grid place-items-center bg-white">Cargando onboarding...</div>;

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1VehicleTypes />;
      case 2: return <Step2Capacity />;
      case 3: return <Step3Rates />;
      case 4: return <Step4BoxAndRegion />;
      case 5: return <Step5Shifts />;
      case 6: return <Step6PaymentMethods />;
      case 7: return <Step7Tickets />;
      case 8: return <Step8Clients />;
      case 9: return <Step9Agreements />;
      case 10: return <Step10Sites />;
      case 11: return <Step11Permissions />;
      case 12: return <Step12Audit />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-background p-6 md:p-10 overflow-y-auto">
      <div className="mx-auto max-w-4xl">
        {/* Header con indicador de guardado */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-default-500">Paso {enabledSteps.indexOf(step) + 1} de {totalEnabledSteps}</p>
            <h1 className="text-2xl font-semibold">{STEP_TITLES[step - 1]}</h1>
          </div>
          <div className="flex items-center gap-2">
            {saveState === "saving" && (
              <div className="flex items-center gap-1 text-xs text-default-400">
                <Save className="w-3 h-3 animate-pulse" />
                <span>Guardando...</span>
              </div>
            )}
            {saveState === "saved" && (
              <div className="flex items-center gap-1 text-xs text-success">
                <Check className="w-3 h-3" />
                <span>Guardado</span>
              </div>
            )}
            {saveState === "error" && (
              <div className="flex items-center gap-1 text-xs text-danger">
                <span>Error al guardar</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-3 h-2 w-full rounded-full bg-default-200">
          <div className="h-2 rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-sm text-default-600">Configura rápido lo esencial. Podrás editar todo luego en Configuración.</p>

        <div className="mt-6 rounded-xl border border-default-200 bg-white dark:bg-zinc-900 p-5 space-y-4">
          {renderStep()}
        </div>

        {Object.keys(stepErrors).length > 0 && (
          <div className="mt-4 flex flex-col gap-1 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3">
            <p className="text-sm font-semibold text-danger">Corrige los siguientes errores para continuar:</p>
            <ul className="list-disc list-inside text-sm text-danger-700">
              {Object.entries(stepErrors).map(([key, message]) => (
                <li key={key}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="ghost"
            onPress={() => {
              clearStepErrors();
              persistStep(getPrevEnabledStep(step, enabledSteps));
            }}
            isDisabled={step === enabledSteps[0]}
          >
            Atrás
          </Button>
          {step !== enabledSteps[enabledSteps.length - 1] && (
            <Button
              color="primary"
              onPress={() => {
                if (!validateCurrentStep()) return;
                clearStepErrors();
                persistStep(getNextEnabledStep(step, enabledSteps));
              }}
              isDisabled={!canAdvance}
            >
              Siguiente
            </Button>
          )}
          {step === enabledSteps[enabledSteps.length - 1] && (
            <Button
              color="primary"
              size="lg"
              className="font-semibold px-6"
              startContent={<Check className="w-5 h-5" />}
              onPress={async () => {
                setSaveState("saving");
                try {
                  await persistStep(step); // Ensure last data is saved

                  // Crear fichas de cascos automáticamente si se configuraron.
                  // Preferimos los datos ya persistidos en el progreso para evitar
                  // discrepanncias con el formulario actual del paso 12.
                  const step1Data = status?.progressData?.step_1 as Record<string, unknown> | undefined;
                  if (step1Data?.helmetHandling === "TOKENS" && step1Data?.helmetLockerCount) {
                    const count = Number(step1Data.helmetLockerCount);
                    if (count > 0 && count <= 9999) {
                      try {
                        await createBatchHelmetLockers("F-", 1, count);
                      } catch (err) {
                        console.error("Error creating helmet lockers during onboarding:", err);
                        setSaveState("error");
                        return;
                      }
                    }
                  }

                  await completeOnboarding(companyId);
                  await patchSessionUser({ onboardingCompleted: true });
                  window.dispatchEvent(new CustomEvent("parkflow-refresh-runtime-config"));
                  onDone();
                } catch {
                  setSaveState("error");
                }
              }}
            >
              Finalizar onboarding
            </Button>
          )}
          {requiredCompleted && (
            <Button color="warning" variant="tertiary" onPress={() => setShowSkipModal(true)}>Omitir parametrización</Button>
          )}
          {!requiredCompleted && (
            <div className="flex items-center gap-2 text-xs text-warning-600 bg-warning-50 px-3 py-2 rounded-lg border border-warning-200">
              <span className="font-semibold flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Debes completar los pasos obligatorios antes de omitir:</span>
              <span>{REQUIRED_STEPS.filter(s => !isStepCompleted(status?.progressData ?? {}, s)).map(s => STEP_TITLES[s - 1]).join(", ")}</span>
            </div>
          )}
        </div>
      </div>

      <Modal
        state={{
          isOpen: showSkipModal,
          setOpen: (v: boolean) => { if (!v) setShowSkipModal(false); },
          open: () => setShowSkipModal(true),
          close: () => setShowSkipModal(false),
          toggle: () => setShowSkipModal((v) => !v),
        }}
        onOpenChange={setShowSkipModal}
        aria-label="Omitir parametrización"
      >
        <Modal.Content>
          <Modal.Header>Omitir parametrización</Modal.Header>
          <Modal.Body>Se aplicará una configuración estándar. Podrás modificarla luego desde Configuración.</Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={() => setShowSkipModal(false)}>Cancelar</Button>
            <Button
              color="warning"
              onPress={async () => {
                setShowSkipModal(false);
                try {
                  await skipOnboarding(companyId);
                  await patchSessionUser({ onboardingCompleted: true });
                  window.dispatchEvent(new CustomEvent("parkflow-refresh-runtime-config"));
                  onDone();
                } catch (err) {
                  console.error("Error skipping onboarding:", err);
                  setSaveState("error");
                }
              }}
            >
              Confirmar omitir
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </div>
  );
}

export default function OnboardingWizard({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  return (
    <OnboardingProvider companyId={companyId} onDone={onDone}>
      <OnboardingContent />
    </OnboardingProvider>
  );
}
