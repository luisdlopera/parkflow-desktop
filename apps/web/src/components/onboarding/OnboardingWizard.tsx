"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Switch } from "@/components/ui/Switch";
import { Input } from "@/components/ui/Input";
import { completeOnboarding, fetchOnboardingStatus, saveOnboardingStep, skipOnboarding, type OnboardingStatus } from "@/lib/onboarding-api";
import QuestionHelp from "./QuestionHelp";
import { Check, Save, Printer, Globe, Hash, AlertTriangle } from "lucide-react";

const STEP_TITLES = [
  "Tipos de vehículo", "Capacidad", "Tarifas", "Caja", "Turnos", "Métodos de pago",
  "Tickets", "Clientes y mensualidades", "Convenios", "Sedes", "Roles y permisos", "Auditoría"
];

const VEHICLE_OPTIONS: Array<{ code: string; label: string; description: string }> = [
  { code: "MOTORCYCLE", label: "Moto", description: "Motocicletas y ciclomotores" },
  { code: "CAR", label: "Carro", description: "Automóviles y sedanes" },
  { code: "BICYCLE", label: "Bicicleta", description: "Bicicletas (no requiere placa)" },
  { code: "VAN", label: "Camioneta", description: "Camionetas, SUVs y vans" },
  { code: "TRUCK", label: "Camión", description: "Camiones de carga" },
  { code: "BUS", label: "Bus", description: "Buses y transporte público" },
  { code: "OTHER", label: "Otro", description: "Vehículos especiales o no categorizados" },
];

const PAYMENT_OPTIONS = [
  { code: "CASH", label: "Efectivo" },
  { code: "DEBIT_CARD", label: "Tarjeta débito" },
  { code: "CREDIT_CARD", label: "Tarjeta crédito" },
  { code: "NEQUI", label: "Nequi" },
  { code: "DAVIPLATA", label: "DaviPlata" },
  { code: "TRANSFER", label: "Transferencia" },
  { code: "QR", label: "Pago QR" },
  { code: "AGREEMENT", label: "Convenio" },
  { code: "MIXED", label: "Mixto" },
];

const COUNTRY_OPTIONS = [
  { code: "CO", label: "Colombia", platePattern: "ABC123", plateExample: "ABC123" },
  { code: "MX", label: "México", platePattern: "ABC1234", plateExample: "ABC1234" },
  { code: "AR", label: "Argentina", platePattern: "AB123CD", plateExample: "AB123CD" },
  { code: "CL", label: "Chile", platePattern: "ABCD12", plateExample: "ABCD12" },
  { code: "PE", label: "Perú", platePattern: "ABC123", plateExample: "ABC123" },
  { code: "US", label: "Estados Unidos", platePattern: "ABC1234", plateExample: "ABC1234" },
  { code: "OTHER", label: "Otro", platePattern: "Libre", plateExample: "Libre" },
];

const PRINTER_OPTIONS = [
  { code: "THERMAL", label: "Impresora térmica", description: "Tiquetes pequeños y rápidos" },
  { code: "DESKJET", label: "Impresora de escritorio", description: "Tiquetes normales" },
  { code: "NONE", label: "Sin impresora", description: "Solo pantalla o digital" },
];

type OperationalProfile = "MOTORCYCLE_ONLY" | "CAR_ONLY" | "MIXED";

/** Pasos obligatorios que deben completarse antes de poder omitir el onboarding */
const REQUIRED_STEPS = [1, 2, 3, 4, 6];

/** Pasos habilitados por defecto (el plan puede restringir algunos) */
const BASE_ENABLED_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12];

function isStepCompleted(progressData: Record<string, unknown>, step: number) {
  const stepKey = `step_${step}`;
  const data = progressData?.[stepKey] as Record<string, unknown> | undefined;
  if (!data) return false;
  switch (step) {
    case 1: return Array.isArray(data.vehicleTypes) && (data.vehicleTypes as string[]).length > 0;
    case 2: return typeof data.totalCapacity === "number" && data.totalCapacity > 0;
    case 3: return typeof data.baseValue === "number" && data.baseValue > 0;
    case 4: return typeof data.countryCode === "string" && data.countryCode.length > 0;
    case 6: return Array.isArray(data.paymentMethods) && (data.paymentMethods as string[]).length > 0;
    default: return Object.keys(data).length > 0;
  }
}

function areRequiredStepsCompleted(progressData: Record<string, unknown>) {
  return REQUIRED_STEPS.every((step) => isStepCompleted(progressData, step));
}

function getEnabledSteps(planOptions: Record<string, unknown>) {
  const enabled = [...BASE_ENABLED_STEPS];
  if (planOptions?.allowMultiLocation) enabled.push(10);
  if (planOptions?.allowAdvancedPermissions) enabled.push(11);
  return enabled.sort((a, b) => a - b);
}

function getNextEnabledStep(current: number, enabledSteps: number[]) {
  const idx = enabledSteps.indexOf(current);
  if (idx === -1 || idx === enabledSteps.length - 1) return current;
  return enabledSteps[idx + 1];
}

function getPrevEnabledStep(current: number, enabledSteps: number[]) {
  const idx = enabledSteps.indexOf(current);
  if (idx <= 0) return current;
  return enabledSteps[idx - 1];
}

function inferOperationalProfile(vehicleTypes: string[]): OperationalProfile {
  const hasMoto = vehicleTypes.includes("MOTORCYCLE");
  const hasCar = vehicleTypes.includes("CAR");
  const hasOthers = vehicleTypes.some((v) => v !== "MOTORCYCLE" && v !== "CAR");
  
  if (hasMoto && !hasCar && !hasOthers) return "MOTORCYCLE_ONLY";
  if (hasCar && !hasMoto && !hasOthers) return "CAR_ONLY";
  return "MIXED";
}

function profileLabel(profile: OperationalProfile): string {
  switch (profile) {
    case "MOTORCYCLE_ONLY": return "Parqueadero de motos";
    case "CAR_ONLY": return "Parqueadero de carros";
    case "MIXED": return "Parqueadero mixto";
  }
}

function profileDescription(profile: OperationalProfile): string {
  switch (profile) {
    case "MOTORCYCLE_ONLY": return "La interfaz se adaptará solo para ingreso de motocicletas.";
    case "CAR_ONLY": return "La interfaz se adaptará solo para ingreso de automóviles.";
    case "MIXED": return "La interfaz mostrará opciones para todos los tipos de vehículos seleccionados.";
  }
}

export default function OnboardingWizard({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [stepData, setStepData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showRateConfig, setShowRateConfig] = useState(false);
  
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedData = useRef<string>("");

  useEffect(() => {
    fetchOnboardingStatus(companyId).then((s) => {
      // Si el paso actual no está habilitado globalmente, saltar al primero disponible
      const safeStep = s.enabledSteps?.includes(s.currentStep)
        ? s.currentStep
        : (s.enabledSteps?.[0] ?? 1);
      const statusWithSafeStep = { ...s, currentStep: safeStep };
      setStatus(statusWithSafeStep);
      const payload = (s.progressData?.[`step_${safeStep}`] as Record<string, unknown>) ?? {};
      setStepData(payload);
      setLoading(false);
      if (s.onboardingCompleted) onDone();
    });
  }, [companyId, onDone]);

  const step = status?.currentStep ?? 1;

  // Pasos habilitados según configuración global + plan de la empresa
  const enabledSteps = useMemo(() => status?.enabledSteps ?? [1,2,3,4,5,6,7,8,9,10,11,12], [status?.enabledSteps]);
  const totalEnabledSteps = enabledSteps.length;
  const isCurrentStepEnabled = enabledSteps.includes(step);
  const progress = useMemo(() => {
    const idx = enabledSteps.indexOf(step);
    if (idx === -1) return 0;
    return Math.round(((idx + 1) / totalEnabledSteps) * 100);
  }, [step, enabledSteps, totalEnabledSteps]);
  const requiredCompleted = useMemo(() => areRequiredStepsCompleted(status?.progressData ?? {}), [status?.progressData]);

  // Auto-save silencioso cada 10 segundos
  useEffect(() => {
    if (autoSaveRef.current) {
      clearInterval(autoSaveRef.current);
    }
    
    autoSaveRef.current = setInterval(() => {
      if (!status || !stepData || Object.keys(stepData).length === 0) return;
      
      const currentData = JSON.stringify(stepData);
      if (currentData === lastSavedData.current) return;
      
      setSaveState("saving");
      saveOnboardingStep(companyId, step, stepData)
        .then((next) => {
          setStatus({ ...next, currentStep: step });
          lastSavedData.current = currentData;
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 2000);
        })
        .catch(() => {
          setSaveState("error");
          setTimeout(() => setSaveState("idle"), 3000);
        });
    }, 10000);
    
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [companyId, step, status, stepData]);
  const canMultiSite = Boolean(status?.availableOptionsByPlan?.allowMultiLocation);
  const canAdvancedPermissions = Boolean(status?.availableOptionsByPlan?.allowAdvancedPermissions);

  const persistStep = async (targetStep: number) => {
    if (!status) return;
    setSaveState("saving");
    try {
      const next = await saveOnboardingStep(companyId, step, stepData);
      // Asegurar que el paso destino esté habilitado; si no, saltar al siguiente/previo habilitado
      const safeStep = enabledSteps.includes(targetStep)
        ? targetStep
        : targetStep > step
          ? getNextEnabledStep(step, enabledSteps)
          : getPrevEnabledStep(step, enabledSteps);
      setStatus({ ...next, currentStep: safeStep });
      const payload = (next.progressData?.[`step_${safeStep}`] as Record<string, unknown>) ?? {};
      setStepData(payload);
      lastSavedData.current = JSON.stringify(payload);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  const vehicleTypes = Array.isArray(stepData.vehicleTypes) ? (stepData.vehicleTypes as string[]) : [];
  const detectedProfile = inferOperationalProfile(vehicleTypes);

  // Helpers para datos complejos
  const getCapacityByType = useCallback(() => {
    const existing = stepData.capacityByType as Record<string, number> ?? {};
    return VEHICLE_OPTIONS.reduce((acc, v) => {
      acc[v.code] = existing[v.code] ?? 0;
      return acc;
    }, {} as Record<string, number>);
  }, [stepData.capacityByType]);

  const getRatesByType = useCallback(() => {
    const existing = stepData.ratesByType as Record<string, number> ?? {};
    return VEHICLE_OPTIONS.reduce((acc, v) => {
      acc[v.code] = existing[v.code] ?? (stepData.baseValue as number ?? 0);
      return acc;
    }, {} as Record<string, number>);
  }, [stepData.ratesByType, stepData.baseValue]);

  if (loading || !status) return <div className="fixed inset-0 z-[120] grid place-items-center bg-white">Cargando onboarding...</div>;

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

        <div className="mt-6 rounded-xl border border-default-200 p-5 space-y-4">
          {/* PASO 1: Tipos de vehículo */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">¿Qué tipos de vehículos recibe tu parqueadero?</p>
                <QuestionHelp title="Tipos de vehículo">
                  Selecciona todos los tipos de vehículos que ingresan a tu parqueadero. 
                  Esto determinará el perfil operacional y las vistas dinámicas del sistema.
                </QuestionHelp>
              </div>
              
              <div className="grid gap-3 sm:grid-cols-2">
                {VEHICLE_OPTIONS.map((item) => (
                  <Checkbox
                    key={item.code}
                    isSelected={vehicleTypes.includes(item.code)}
                    onChange={(checked: boolean) => {
                      const prev = vehicleTypes;
                      const next = checked ? [...prev, item.code] : prev.filter((v) => v !== item.code);
                      const profile = inferOperationalProfile(next);
                      setStepData({ ...stepData, vehicleTypes: next, operationalProfile: profile });
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs text-default-400">{item.description}</span>
                    </div>
                  </Checkbox>
                ))}
              </div>

              {vehicleTypes.length > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-primary-50 border border-primary-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-primary">Perfil detectado:</span>
                    <span className="text-sm font-bold text-primary">{profileLabel(detectedProfile)}</span>
                  </div>
                  <p className="text-xs text-primary-600">{profileDescription(detectedProfile)}</p>
                </div>
              )}

              {vehicleTypes.length === 0 && (
                <div className="mt-4 p-3 rounded-lg bg-warning-50 border border-warning-200">
                  <p className="text-xs text-warning-600">
                    Selecciona al menos un tipo de vehículo para continuar.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PASO 2: Capacidad (Mejorado con capacidad por tipo) */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">¿Cuál es la capacidad de tu parqueadero?</p>
                <QuestionHelp title="Capacidad">
                  Configura la capacidad total y por tipo de vehículo. Esto permite controlar cupos específicos.
                </QuestionHelp>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-default-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-default-400" />
                    <span className="text-sm font-medium">Capacidad total</span>
                  </div>
                  <Input 
                    type="number" 
                    className="w-32"
                    aria-label="Capacidad total"
                    value={String(stepData.totalCapacity ?? "")} 
                    onChange={(v) => setStepData({ ...stepData, totalCapacity: Number(v.target.value) || 0 })} 
                  />
                </div>
                
                <Switch isSelected={Boolean(stepData.controlSlots)} onChange={(v) => setStepData({ ...stepData, controlSlots: v })}>
                  ¿Quieres controlar cupos?
                </Switch>
                
                {Boolean(stepData.controlSlots) && vehicleTypes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-default-600">Capacidad por tipo de vehículo:</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {vehicleTypes.map((typeCode) => {
                        const vehicle = VEHICLE_OPTIONS.find(v => v.code === typeCode);
                        const capacity = getCapacityByType()[typeCode] ?? 0;
                        return (
                          <div key={typeCode} className="flex items-center justify-between p-2 bg-default-50 rounded-lg">
                            <span className="text-sm">{vehicle?.label}</span>
                            <Input 
                              type="number" 
                              className="w-24"
                              aria-label={`Capacidad ${vehicle?.label ?? typeCode}`}
                              value={String(capacity)} 
                              onChange={(v) => {
                                const current = getCapacityByType();
                                const next = { ...current, [typeCode]: Number(v.target.value) || 0 };
                                setStepData({ ...stepData, capacityByType: next });
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO 3: Tarifas (Mejorado con tarifas por tipo) */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Configuración de tarifas</p>
                <QuestionHelp title="Tarifas">
                  Configura el valor base y tarifas específicas por tipo de vehículo.
                </QuestionHelp>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-default-50 rounded-lg">
                  <span className="text-sm font-medium">Tarifa base por hora</span>
                  <Input 
                    type="number" 
                    className="w-40"
                    label="Valor"
                    value={String(stepData.baseValue ?? "")} 
                    onChange={(v) => setStepData({ ...stepData, baseValue: Number(v.target.value) || 0, mode: "HOURLY" })} 
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch 
                    isSelected={Boolean(stepData.enableRateByType)} 
                    onChange={(v) => setStepData({ ...stepData, enableRateByType: v })}
                  >
                    Configurar tarifas por tipo de vehículo
                  </Switch>
                </div>
                
                {Boolean(stepData.enableRateByType) && vehicleTypes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-default-600">Tarifas específicas:</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {vehicleTypes.map((typeCode) => {
                        const vehicle = VEHICLE_OPTIONS.find(v => v.code === typeCode);
                        const rate = getRatesByType()[typeCode] ?? (stepData.baseValue as number ?? 0);
                        return (
                          <div key={typeCode} className="flex items-center justify-between p-2 bg-default-50 rounded-lg">
                            <span className="text-sm">{vehicle?.label}</span>
                            <Input 
                              type="number" 
                              className="w-32"
                              aria-label={`Tarifa ${vehicle?.label ?? typeCode}`}
                              value={String(rate)} 
                              onChange={(v) => {
                                const current = getRatesByType();
                                const next = { ...current, [typeCode]: Number(v.target.value) || 0 };
                                setStepData({ ...stepData, ratesByType: next });
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-default-600">Tarifas especiales:</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center justify-between p-2 bg-default-50 rounded-lg">
                      <span className="text-sm">Tarifa mínima (minutos)</span>
                      <Input 
                        type="number" 
                        className="w-24"
                        aria-label="Tarifa mínima en minutos"
                        value={String(stepData.minRateMinutes ?? "0")} 
                        onChange={(v) => setStepData({ ...stepData, minRateMinutes: Number(v.target.value) || 0 })} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-default-50 rounded-lg">
                      <span className="text-sm">Tarifa diaria (24h)</span>
                      <Input 
                        type="number" 
                        className="w-32"
                        aria-label="Tarifa diaria"
                        value={String(stepData.dailyRate ?? "")} 
                        onChange={(v) => setStepData({ ...stepData, dailyRate: Number(v.target.value) || 0 })} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-default-50 rounded-lg">
                      <span className="text-sm">Tarifa nocturna</span>
                      <Input 
                        type="number" 
                        className="w-32"
                        aria-label="Tarifa nocturna"
                        value={String(stepData.nightRate ?? "")} 
                        onChange={(v) => setStepData({ ...stepData, nightRate: Number(v.target.value) || 0 })} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-default-50 rounded-lg">
                      <span className="text-sm">Tiempo de gracia (min)</span>
                      <Input 
                        type="number" 
                        className="w-24"
                        aria-label="Tiempo de gracia en minutos"
                        value={String(stepData.graceMinutes ?? "0")} 
                        onChange={(v) => setStepData({ ...stepData, graceMinutes: Number(v.target.value) || 0 })} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: Caja + Configuración de país/prefijo */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-default-400" />
                  <p className="text-sm font-medium">Configuración regional</p>
                </div>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  {COUNTRY_OPTIONS.map((country) => (
                    <Checkbox
                      key={country.code}
                      isSelected={stepData.countryCode === country.code}
                      onChange={(checked: boolean) => {
                        if (checked) {
                          setStepData({ ...stepData, countryCode: country.code, platePattern: country.platePattern });
                        }
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{country.label}</span>
                        <span className="text-xs text-default-400">Formato: {country.plateExample}</span>
                      </div>
                    </Checkbox>
                  ))}
                </div>
                
                <div className="flex items-center justify-between p-3 bg-default-50 rounded-lg">
                  <span className="text-sm font-medium">Prefijo de placa (opcional)</span>
                  <Input 
                    className="w-32"
                    aria-label="Prefijo de placa"
                    value={String(stepData.platePrefix ?? "")} 
                    onChange={(v) => setStepData({ ...stepData, platePrefix: v.target.value.toUpperCase() })} 
                    placeholder="Ej: ABC"
                  />
                </div>
              </div>
              
              <div className="border-t border-default-200 pt-4">
                <Switch isSelected={Boolean(stepData.enabled)} onChange={(v) => setStepData({ ...stepData, enabled: v })}>
                  ¿Manejas caja por operador?
                </Switch>
              </div>
            </div>
          )}

          {/* PASO 5: Turnos */}
          {step === 5 && (
            <div className="space-y-4">
              <Switch isSelected={Boolean(stepData.enabled)} onChange={(v) => setStepData({ ...stepData, enabled: v })}>
                ¿Trabajan por turnos?
              </Switch>
              
              {Boolean(stepData.enabled) && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-default-600">Horarios de turno:</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center justify-between p-2 bg-default-50 rounded-lg">
                      <span className="text-sm">Turno diurno inicio</span>
                      <Input 
                        type="time" 
                        className="w-32"
                        aria-label="Inicio turno diurno"
                        value={String(stepData.dayShiftStart ?? "06:00")} 
                        onChange={(v) => setStepData({ ...stepData, dayShiftStart: v.target.value })} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-default-50 rounded-lg">
                      <span className="text-sm">Turno diurno fin</span>
                      <Input 
                        type="time" 
                        className="w-32"
                        aria-label="Fin turno diurno"
                        value={String(stepData.dayShiftEnd ?? "18:00")} 
                        onChange={(v) => setStepData({ ...stepData, dayShiftEnd: v.target.value })} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-default-50 rounded-lg">
                      <span className="text-sm">Turno nocturno inicio</span>
                      <Input 
                        type="time" 
                        className="w-32"
                        aria-label="Inicio turno nocturno"
                        value={String(stepData.nightShiftStart ?? "18:00")} 
                        onChange={(v) => setStepData({ ...stepData, nightShiftStart: v.target.value })} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-default-50 rounded-lg">
                      <span className="text-sm">Turno nocturno fin</span>
                      <Input 
                        type="time" 
                        className="w-32"
                        aria-label="Fin turno nocturno"
                        value={String(stepData.nightShiftEnd ?? "06:00")} 
                        onChange={(v) => setStepData({ ...stepData, nightShiftEnd: v.target.value })} 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 6: Métodos de pago */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">¿Qué métodos de pago aceptas?</p>
                <QuestionHelp title="Métodos de pago">
                  Selecciona todos los métodos de pago que aceptas en tu parqueadero.
                </QuestionHelp>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {PAYMENT_OPTIONS.map((item) => (
                  <Checkbox
                    key={item.code}
                    isSelected={Array.isArray(stepData.paymentMethods) && (stepData.paymentMethods as string[]).includes(item.code)}
                    onChange={(checked: boolean) => {
                      const prev = Array.isArray(stepData.paymentMethods) ? (stepData.paymentMethods as string[]) : [];
                      const next = checked ? [...prev, item.code] : prev.filter((v) => v !== item.code);
                      setStepData({ ...stepData, paymentMethods: next });
                    }}
                  >
                    {item.label}
                  </Checkbox>
                ))}
              </div>
            </div>
          )}

          {/* PASO 7: Tickets + Impresora */}
          {step === 7 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-default-400" />
                  <p className="text-sm font-medium">Configuración de impresión</p>
                </div>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  {PRINTER_OPTIONS.map((item) => (
                    <Checkbox
                      key={item.code}
                      isSelected={stepData.printerType === item.code}
                      onChange={(checked: boolean) => {
                        if (checked) setStepData({ ...stepData, printerType: item.code });
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-xs text-default-400">{item.description}</span>
                      </div>
                    </Checkbox>
                  ))}
                </div>
                
                <div className="flex items-center justify-between p-3 bg-default-50 rounded-lg">
                  <span className="text-sm font-medium">Nombre de la impresora (opcional)</span>
                  <Input 
                    className="w-48"
                    aria-label="Nombre de la impresora"
                    value={String(stepData.printerName ?? "")} 
                    onChange={(v) => setStepData({ ...stepData, printerName: v.target.value })} 
                    placeholder="Ej: EPSON-TM-T20"
                  />
                </div>
              </div>
              
              <div className="border-t border-default-200 pt-4">
                <Switch isSelected={Boolean(stepData.allowReprint)} onChange={(v) => setStepData({ ...stepData, allowReprint: v })}>
                  Permitir reimpresión de tickets
                </Switch>
              </div>
              
              <div className="border-t border-default-200 pt-4">
                <Switch isSelected={Boolean(stepData.showTicketPreview)} onChange={(v) => setStepData({ ...stepData, showTicketPreview: v })}>
                  Mostrar vista previa del ticket antes de imprimir
                </Switch>
              </div>
            </div>
          )}

          {/* PASO 8: Clientes y mensualidades + Casco configurable */}
          {step === 8 && (
            <div className="space-y-4">
              <Switch isSelected={Boolean(stepData.enabled)} onChange={(v) => setStepData({ ...stepData, enabled: v })}>
                ¿Manejas clientes frecuentes o mensualidades?
              </Switch>
              
              {vehicleTypes.includes("MOTORCYCLE") && (
                <div className="border-t border-default-200 pt-4">
                  <Switch isSelected={Boolean(stepData.enableHelmetSection)} onChange={(v) => setStepData({ ...stepData, enableHelmetSection: v })}>
                    ¿Registras cascos/cascos de moto en custodia?
                  </Switch>
                  
                  {Boolean(stepData.enableHelmetSection) && (
                    <div className="mt-2 p-3 bg-default-50 rounded-lg">
                      <p className="text-xs text-default-600">
                        Se mostrará una sección adicional en el ingreso para registrar el número de casco y observaciones.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PASO 9: Convenios */}
          {step === 9 && (
            <div className="space-y-4">
              <Switch isSelected={Boolean(stepData.enabled)} onChange={(v) => setStepData({ ...stepData, enabled: v })}>
                ¿Tienes convenios con empresas?
              </Switch>
              
              {Boolean(stepData.enabled) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-default-50 rounded-lg">
                    <span className="text-sm">Descuento por convenio (%)</span>
                    <Input 
                      type="number" 
                      className="w-24"
                      aria-label="Descuento por convenio"
                      value={String(stepData.agreementDiscount ?? "0")} 
                      onChange={(v) => setStepData({ ...stepData, agreementDiscount: Number(v.target.value) || 0 })} 
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 10: Sedes */}
          {step === 10 && (
            <div>
              <Switch isSelected={Boolean(stepData.multiSite)} isDisabled={!canMultiSite} onChange={(v) => setStepData({ ...stepData, multiSite: v })}>
                ¿Varias sedes?
              </Switch>
              {!canMultiSite && <p className="text-xs text-warning mt-1">Disponible en plan superior.</p>}
              
              {Boolean(stepData.multiSite) && canMultiSite && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between p-2 bg-default-50 rounded-lg">
                    <span className="text-sm">Nombre sede principal</span>
                    <Input 
                      className="w-48"
                      aria-label="Nombre sede principal"
                      value={String(stepData.siteName1 ?? "Sede principal")} 
                      onChange={(v) => setStepData({ ...stepData, siteName1: v.target.value })} 
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-default-50 rounded-lg">
                    <span className="text-sm">Nombre sede secundaria</span>
                    <Input 
                      className="w-48"
                      aria-label="Nombre sede secundaria"
                      value={String(stepData.siteName2 ?? "Sede secundaria")} 
                      onChange={(v) => setStepData({ ...stepData, siteName2: v.target.value })} 
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 11: Roles y permisos */}
          {step === 11 && (
            <div>
              <Switch isSelected={Boolean(stepData.advanced)} isDisabled={!canAdvancedPermissions} onChange={(v) => setStepData({ ...stepData, advanced: v })}>
                Permisos avanzados
              </Switch>
              {!canAdvancedPermissions && <p className="text-xs text-warning mt-1">Disponible en plan superior.</p>}
            </div>
          )}

          {/* PASO 12: Auditoría */}
          {step === 12 && (
            <div className="space-y-4">
              <p className="text-sm text-default-600">Se mantendrá activa auditoría crítica: cobros, anulaciones y cierre de caja.</p>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-default-600">Resumen de configuración:</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="p-2 bg-default-50 rounded-lg">
                    <span className="text-xs text-default-500">Perfil:</span>
                    <p className="text-sm font-medium">{profileLabel(detectedProfile)}</p>
                  </div>
                  <div className="p-2 bg-default-50 rounded-lg">
                    <span className="text-xs text-default-500">Vehículos:</span>
                    <p className="text-sm font-medium">{vehicleTypes.length} tipos</p>
                  </div>
                  <div className="p-2 bg-default-50 rounded-lg">
                    <span className="text-xs text-default-500">Capacidad:</span>
                    <p className="text-sm font-medium">{stepData.totalCapacity ? String(stepData.totalCapacity) : "No configurada"}</p>
                  </div>
                  <div className="p-2 bg-default-50 rounded-lg">
                    <span className="text-xs text-default-500">Tarifa base:</span>
                    <p className="text-sm font-medium">{stepData.baseValue ? `$${String(stepData.baseValue)}` : "No configurada"}</p>
                  </div>
                  <div className="p-2 bg-default-50 rounded-lg">
                    <span className="text-xs text-default-500">Caja:</span>
                    <p className="text-sm font-medium">{stepData.enabled ? "Sí" : "No"}</p>
                  </div>
                  <div className="p-2 bg-default-50 rounded-lg">
                    <span className="text-xs text-default-500">Turnos:</span>
                    <p className="text-sm font-medium">{stepData.enabled ? "Sí" : "No"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="ghost" onPress={() => persistStep(getPrevEnabledStep(step, enabledSteps))} isDisabled={step === enabledSteps[0]}>Atrás</Button>
          {step !== enabledSteps[enabledSteps.length - 1] && (
            <Button 
              color="primary" 
              onPress={() => persistStep(getNextEnabledStep(step, enabledSteps))}
              isDisabled={step === 1 && vehicleTypes.length === 0}
            >
              Siguiente
            </Button>
          )}
          {step === enabledSteps[enabledSteps.length - 1] && (
            <Button
              color="success"
              onPress={async () => {
                setSaveState("saving");
                try {
                  await saveOnboardingStep(companyId, step, stepData);
                  await completeOnboarding(companyId);
                  onDone();
                } catch {
                  setSaveState("error");
                }
              }}
            >
              Finalizar
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

      <Modal state={ { isOpen: showSkipModal, setOpen: () => {}, open: () => {}, close: () => {}, toggle: () => {} } } onOpenChange={setShowSkipModal}>
        <Modal.Content>
          <Modal.Header>Omitir parametrización</Modal.Header>
          <Modal.Body>Se aplicará una configuración estándar. Podrás modificarla luego desde Configuración.</Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={() => setShowSkipModal(false)}>Cancelar</Button>
            <Button color="warning" onPress={async () => { await skipOnboarding(companyId); onDone(); }}>Confirmar omitir</Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </div>
  );
}
