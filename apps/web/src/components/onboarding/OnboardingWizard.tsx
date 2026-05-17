"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Switch, Select, SelectItem } from "@heroui/react";
import QuestionHelp from "./QuestionHelp";
import { completeOnboarding, fetchOnboardingStatus, saveOnboardingStep, skipOnboarding, type OnboardingStatus } from "@/lib/onboarding-api";

const OPERATIONAL_PROFILES = [
  { key: "MIXED", label: "Mixto (Carros, motos, etc.)", desc: "El parqueadero acepta carros, motos y opcionalmente otros vehículos." },
  { key: "MOTORCYCLE_ONLY", label: "Solo motos", desc: "Oculta el selector de tipo de vehículo en el ingreso y fuerza 'MOTORCYCLE'." },
  { key: "CAR_ONLY", label: "Solo carros", desc: "Oculta el selector de tipo de vehículo en el ingreso y fuerza 'CAR'." },
  { key: "VALET", label: "Servicio de Valet Parking", desc: "Habilita registro del estado del vehículo, inventario físico y fotos al ingresar." },
  { key: "RESIDENTIAL", label: "Residencial", desc: "Pensado para residentes con mensualidades activas y visitas controladas." },
  { key: "PUBLIC", label: "Público de alta rotación", desc: "Habilita tarifas manuales, selección de múltiples carriles y cajeros." },
  { key: "ENTERPRISE", label: "Empresarial / Corporativo", desc: "Enfocado en empleados con convenios y flujos rápidos de ingreso." }
];

const STEP_TITLES = [
  "Tipos de vehículo", "Capacidad", "Tarifas", "Caja", "Turnos", "Métodos de pago",
  "Tickets", "Clientes y mensualidades", "Convenios", "Sedes", "Roles y permisos", "Auditoría"
];

const STEP_HELP_TEXTS: string[] = [
  "Indica qué tipos de vehículos aceptas en tu parqueadero. Esta selección afectará la clasificación en caja, reportes y posibles tarifas por tipo.",
  "Define la capacidad total de tu parqueadero. Esto se usa para controlar ingresos cuando el control de cupos está activo.",
  "Configura el valor base de la tarifa. Puedes ajustar fracciones y políticas adicionales luego en Configuración.",
  "Decide si manejas caja por operador. Si activas, cada operador tendrá su propio registro de cierre.",
  "Indica si tu operación funciona con turnos para registrar entradas y salidas por horario de trabajo.",
  "Selecciona los métodos de pago que aceptas. Algunas opciones pueden requerir un plan superior.",
  "Configura si permites reimpresiones de tickets y controla la política de reimpresión.",
  "Activa soporte para clientes frecuentes y mensualidades para gestionar cobros recurrentes.",
  "Define si trabajas con convenios (descuentos o acuerdos especiales con empresas).",
  "Activa multi-sede para gestionar varias ubicaciones desde una sola cuenta.",
  "Configura roles y permisos avanzados para segregar responsabilidades entre usuarios.",
  "La auditoría registra acciones críticas: cobros, anulaciones y cierres de caja. Se mantendrá activa.",
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
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{STEP_TITLES[step - 1]}</h1>
          {STEP_HELP_TEXTS[step - 1] && (
            <QuestionHelp id={`step-help-${step}`} title="Más información">
              {STEP_HELP_TEXTS[step - 1]}
            </QuestionHelp>
          )}
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-default-200">
          <div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-sm text-default-600">Configura rápido lo esencial. Podrás editar todo luego en Configuración.</p>

        <div className="mt-6 rounded-xl border border-default-200 p-5 space-y-4 bg-white dark:bg-neutral-950">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-default-700">Perfil Operacional</label>
                  <QuestionHelp>
                    El perfil operacional adapta dinámicamente todo el sistema de ParkFlow (flujos de ingreso, pantallas, permisos, defaults y validaciones).
                  </QuestionHelp>
                </div>
                <Select
                  aria-label="Perfil operacional"
                  variant="flat"
                  placeholder="Selecciona el perfil operacional"
                  selectedKeys={stepData.operationalProfile ? [String(stepData.operationalProfile)] : (stepData.businessModel ? [String(stepData.businessModel)] : ["MIXED"])}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    let vehicles = ["MOTO", "CARRO"];
                    if (selected === "MOTORCYCLE_ONLY") vehicles = ["MOTO"];
                    if (selected === "CAR_ONLY") vehicles = ["CARRO"];
                    setStepData({
                      ...stepData,
                      businessModel: selected,
                      operationalProfile: selected,
                      vehicleTypes: vehicles
                    });
                  }}
                >
                  {OPERATIONAL_PROFILES.map((model) => (
                    <SelectItem key={model.key} textValue={model.label} description={model.desc}>
                      {model.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              {String(stepData.operationalProfile ?? stepData.businessModel ?? "MIXED") !== "MOTORCYCLE_ONLY" && String(stepData.operationalProfile ?? stepData.businessModel ?? "MIXED") !== "CAR_ONLY" ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-default-700">Tipos de vehículo permitidos</label>
                    <QuestionHelp>
                      Selecciona los tipos de vehículo que aceptas. Esta selección afectará la clasificación en caja, reportes y posibles tarifas por tipo.
                    </QuestionHelp>
                  </div>
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
                </div>
              ) : (
                <div className="bg-primary-50 dark:bg-primary-950/20 text-primary-800 dark:text-primary-400 rounded-xl p-4 text-xs border border-primary-100 dark:border-primary-900/30">
                  ✨ <strong>Modo adaptativo automático:</strong> El tipo de vehículo se ha configurado por defecto y se auto-asignará a los ingresos. La interfaz del operador omitirá selects innecesarios para optimizar la velocidad y evitar errores de registro.
                </div>
              )}
            </div>
          )}
          {step === 2 && (
            <>
              <Input type="number" label="Capacidad total" value={String(stepData.totalCapacity ?? "")} onValueChange={(v) => setStepData({ ...stepData, totalCapacity: Number(v) || 0 })} />
              <div className="flex items-center gap-2">
                <Switch isSelected={Boolean(stepData.controlSlots)} onValueChange={(v) => setStepData({ ...stepData, controlSlots: v })}>¿Quieres controlar cupos?</Switch>
                <QuestionHelp>
                  Si activas el control de cupos, el sistema contabilizará y bloqueará ingresos cuando se alcance la capacidad definida.
                </QuestionHelp>
              </div>
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
                   {!allowedPayments.includes(item) && <p className="text-xs text-warning-700">Disponible en plan superior.</p>}
                  </div>
                ))}
              </div>
          )}
          {step === 7 && <Switch isSelected={Boolean(stepData.allowReprint)} onValueChange={(v) => setStepData({ ...stepData, allowReprint: v })}>Permitir reimpresión</Switch>}
          {step === 8 && <Switch isSelected={Boolean(stepData.enabled)} onValueChange={(v) => setStepData({ ...stepData, enabled: v })}>¿Manejas clientes frecuentes o mensualidades?</Switch>}
          {step === 9 && <Switch isSelected={Boolean(stepData.enabled)} onValueChange={(v) => setStepData({ ...stepData, enabled: v })}>¿Tienes convenios?</Switch>}
          {step === 10 && (
            <div>
              <div>
                <div className="flex items-center gap-2">
                  <Switch isSelected={Boolean(stepData.multiSite)} isDisabled={!canMultiSite} onValueChange={(v) => setStepData({ ...stepData, multiSite: v })}>¿Varias sedes?</Switch>
                  <QuestionHelp>
                    Con varias sedes podrás administrar inventarios y reportes por ubicación, y permitir el movimiento entre sedes.
                  </QuestionHelp>
                </div>
                {!canMultiSite && <p className="text-xs text-warning-700 mt-1">Disponible en plan superior.</p>}
              </div>
            </div>
          )}
          {step === 11 && (
            <div>
              <div>
                <div className="flex items-center gap-2">
                  <Switch isSelected={Boolean(stepData.advanced)} isDisabled={!canAdvancedPermissions} onValueChange={(v) => setStepData({ ...stepData, advanced: v })}>Permisos avanzados</Switch>
                  <QuestionHelp>
                    Los permisos avanzados permiten roles con capacidades específicas (por ejemplo, ver reportes, anular cobros, crear convenios).
                  </QuestionHelp>
                </div>
                {!canAdvancedPermissions && <p className="text-xs text-warning-700 mt-1">Disponible en plan superior.</p>}
              </div>
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
