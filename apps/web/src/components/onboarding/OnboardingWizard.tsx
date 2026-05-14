"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Switch } from "@heroui/react";
import { completeOnboarding, fetchOnboardingStatus, saveOnboardingStep, skipOnboarding, type OnboardingStatus } from "@/lib/onboarding-api";

const STEP_TITLES = [
  "Tipos de vehículo", "Capacidad", "Tarifas", "Caja", "Turnos", "Métodos de pago",
  "Tickets", "Clientes y mensualidades", "Convenios", "Sedes", "Roles y permisos", "Auditoría"
];

const OPTIONS = {
  vehicles: ["MOTO", "CARRO", "BICICLETA", "CAMIONETA", "CAMION", "BUS", "OTRO"],
  payments: ["EFECTIVO", "TARJETA_DEBITO", "TARJETA_CREDITO", "NEQUI", "DAVIPLATA", "TRANSFERENCIA", "QR", "CONVENIO", "MIXTO"]
};

export default function OnboardingWizard({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [stepData, setStepData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [showSkipModal, setShowSkipModal] = useState(false);

  useEffect(() => {
    fetchOnboardingStatus(companyId).then((s) => {
      setStatus(s);
      const step = s.currentStep;
      const payload = (s.progressData?.[`step_${step}`] as Record<string, unknown>) ?? {};
      setStepData(payload);
      setLoading(false);
      if (s.onboardingCompleted) onDone();
    });
  }, [companyId, onDone]);

  const step = status?.currentStep ?? 1;
  const progress = useMemo(() => Math.round((step / 12) * 100), [step]);
  const canMultiSite = Boolean(status?.availableOptionsByPlan?.allowMultiLocation);
  const canAdvancedPermissions = Boolean(status?.availableOptionsByPlan?.allowAdvancedPermissions);
  const allowedPayments = Array.isArray(status?.availableOptionsByPlan?.paymentMethods)
    ? (status.availableOptionsByPlan.paymentMethods as string[])
    : OPTIONS.payments;

  const persistStep = async (nextStep: number) => {
    if (!status) return;
    const next = await saveOnboardingStep(companyId, step, stepData);
    setStatus({ ...next, currentStep: Math.min(nextStep, 12) });
    const payload = (next.progressData?.[`step_${Math.min(nextStep, 12)}`] as Record<string, unknown>) ?? {};
    setStepData(payload);
  };

  if (loading || !status) return <div className="fixed inset-0 z-[120] grid place-items-center bg-white">Cargando onboarding...</div>;

  return (
    <div className="fixed inset-0 z-[120] bg-background p-6 md:p-10 overflow-y-auto">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-default-500">Paso {step} de 12</p>
        <h1 className="text-2xl font-semibold">{STEP_TITLES[step - 1]}</h1>
        <div className="mt-3 h-2 w-full rounded-full bg-default-200">
          <div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-sm text-default-600">Configura rápido lo esencial. Podrás editar todo luego en Configuración.</p>

        <div className="mt-6 rounded-xl border border-default-200 p-5 space-y-4">
          {step === 1 && (
            <>
              <p className="text-sm">¿Qué tipos de vehículos recibe tu parqueadero?</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {OPTIONS.vehicles.map((item) => (
                  <Checkbox
                    key={item}
                    isSelected={Array.isArray(stepData.vehicleTypes) && (stepData.vehicleTypes as string[]).includes(item)}
                    onValueChange={(checked) => {
                      const prev = Array.isArray(stepData.vehicleTypes) ? (stepData.vehicleTypes as string[]) : [];
                      const next = checked ? [...prev, item] : prev.filter((v) => v !== item);
                      setStepData({ ...stepData, vehicleTypes: next });
                    }}
                  >
                    {item}
                  </Checkbox>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <Input type="number" label="Capacidad total" value={String(stepData.totalCapacity ?? "")} onValueChange={(v) => setStepData({ ...stepData, totalCapacity: Number(v) || 0 })} />
              <Switch isSelected={Boolean(stepData.controlSlots)} onValueChange={(v) => setStepData({ ...stepData, controlSlots: v })}>¿Quieres controlar cupos?</Switch>
            </>
          )}
          {step === 3 && <Input type="number" label="Valor base de tarifa" value={String(stepData.baseValue ?? "")} onValueChange={(v) => setStepData({ ...stepData, baseValue: Number(v) || 0, mode: "HOURLY" })} />}
          {step === 4 && <Switch isSelected={Boolean(stepData.enabled)} onValueChange={(v) => setStepData({ ...stepData, enabled: v })}>¿Manejas caja por operador?</Switch>}
          {step === 5 && <Switch isSelected={Boolean(stepData.enabled)} onValueChange={(v) => setStepData({ ...stepData, enabled: v })}>¿Trabajan por turnos?</Switch>}
          {step === 6 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {OPTIONS.payments.map((item) => (
                <div key={item}>
                  <Checkbox
                    isDisabled={!allowedPayments.includes(item)}
                    isSelected={Array.isArray(stepData.paymentMethods) && (stepData.paymentMethods as string[]).includes(item)}
                    onValueChange={(checked) => {
                      const prev = Array.isArray(stepData.paymentMethods) ? (stepData.paymentMethods as string[]) : [];
                      const next = checked ? [...prev, item] : prev.filter((v) => v !== item);
                      setStepData({ ...stepData, paymentMethods: next });
                    }}
                  >
                    {item}
                  </Checkbox>
                  {!allowedPayments.includes(item) && <p className="text-xs text-warning">Disponible en plan superior.</p>}
                </div>
              ))}
            </div>
          )}
          {step === 7 && <Switch isSelected={Boolean(stepData.allowReprint)} onValueChange={(v) => setStepData({ ...stepData, allowReprint: v })}>Permitir reimpresión</Switch>}
          {step === 8 && <Switch isSelected={Boolean(stepData.enabled)} onValueChange={(v) => setStepData({ ...stepData, enabled: v })}>¿Manejas clientes frecuentes o mensualidades?</Switch>}
          {step === 9 && <Switch isSelected={Boolean(stepData.enabled)} onValueChange={(v) => setStepData({ ...stepData, enabled: v })}>¿Tienes convenios?</Switch>}
          {step === 10 && (
            <div>
              <Switch isSelected={Boolean(stepData.multiSite)} isDisabled={!canMultiSite} onValueChange={(v) => setStepData({ ...stepData, multiSite: v })}>¿Varias sedes?</Switch>
              {!canMultiSite && <p className="text-xs text-warning mt-1">Disponible en plan superior.</p>}
            </div>
          )}
          {step === 11 && (
            <div>
              <Switch isSelected={Boolean(stepData.advanced)} isDisabled={!canAdvancedPermissions} onValueChange={(v) => setStepData({ ...stepData, advanced: v })}>Permisos avanzados</Switch>
              {!canAdvancedPermissions && <p className="text-xs text-warning mt-1">Disponible en plan superior.</p>}
            </div>
          )}
          {step === 12 && <p className="text-sm text-default-600">Se mantendrá activa auditoría crítica: cobros, anulaciones y cierre de caja.</p>}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="light" onPress={() => persistStep(Math.max(1, step - 1))} isDisabled={step === 1}>Atrás</Button>
          {step < 12 && <Button color="primary" onPress={() => persistStep(step + 1)}>Siguiente</Button>}
          {step === 12 && (
            <Button
              color="success"
              onPress={async () => {
                await saveOnboardingStep(companyId, step, stepData);
                await completeOnboarding(companyId);
                onDone();
              }}
            >
              Finalizar
            </Button>
          )}
          <Button color="warning" variant="flat" onPress={() => setShowSkipModal(true)}>Omitir parametrización</Button>
        </div>
      </div>

      <Modal isOpen={showSkipModal} onOpenChange={setShowSkipModal}>
        <ModalContent>
          <ModalHeader>Omitir parametrización</ModalHeader>
          <ModalBody>Se aplicará una configuración estándar. Podrás modificarla luego desde Configuración.</ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setShowSkipModal(false)}>Cancelar</Button>
            <Button color="warning" onPress={async () => { await skipOnboarding(companyId); onDone(); }}>Confirmar omitir</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
