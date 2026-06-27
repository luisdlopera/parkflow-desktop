import { Input } from "@/components/bridge/Input";
import { Switch } from "@/components/bridge/Switch";
import { Button } from "@/components/bridge/Button";
import { Select } from "@/components/bridge/Select";
import { RadioGroup, Radio, Card, ListBox, FieldError } from "@heroui/react";
import QuestionHelp from "../QuestionHelp";
import { memo } from "react";
import { useOnboardingData, useOnboardingMetadata, VEHICLE_OPTIONS } from "../OnboardingContext";
import { Check, Info, Clock, Moon, Calendar, Zap, RefreshCcw } from "lucide-react";

function RequiredMark() {
  return <span className="text-danger ml-0.5" aria-hidden="true">*</span>;
}

const Step3Rates = memo(function Step3Rates() {
  const { stepData, setStepData, stepErrors, getRatesByType } = useOnboardingData();
  const { vehicleTypes } = useOnboardingMetadata();

  const billingModel = String(stepData.billingModel || "");
  const hasNightRate = Boolean(stepData.hasNightRate);
  const hasFullDayRate = Boolean(stepData.hasFullDayRate);
  const hasFractions = Boolean(stepData.hasFractions);
  const hasCourtesy = Boolean(stepData.hasCourtesy);
  const enableRateByType = Boolean(stepData.enableRateByType);
  const hasWeekendRate = Boolean(stepData.hasWeekendRate);

  const isBasicSelected = billingModel === "HOURLY" && !hasFractions && !hasNightRate && !hasFullDayRate;
  const isCommercialSelected = billingModel === "HOURLY" && hasFractions && hasCourtesy;
  const is24HSelected = billingModel === "MIXED" && hasNightRate && hasFullDayRate;

  const applyPreset = (preset: "BASIC" | "COMMERCIAL" | "24H") => {
    switch (preset) {
      case "BASIC":
        setStepData({
          ...stepData,
          billingModel: "HOURLY",
          baseValue: Math.max(1, Number(stepData.baseValue) || 2000),
          hasNightRate: false,
          hasFullDayRate: false,
          hasFractions: false,
          minFractionMinutes: 60,
          hasCourtesy: false,
          graceMinutes: 5,
          enableRateByType: false,
          rounding: "EXACT",
        });
        break;
      case "COMMERCIAL":
        setStepData({
          ...stepData,
          billingModel: "HOURLY",
          baseValue: Math.max(1, Number(stepData.baseValue) || 2000),
          hasNightRate: false,
          hasFullDayRate: false,
          hasFractions: true,
          minFractionMinutes: 15,
          hasCourtesy: true,
          graceMinutes: 15,
          rounding: "15_MIN",
          enableRateByType: false,
        });
        break;
      case "24H":
        setStepData({
          ...stepData,
          billingModel: "MIXED",
          baseValue: Math.max(1, Number(stepData.baseValue) || 2000),
          hasNightRate: true,
          nightStartTime: "20:00",
          nightEndTime: "06:00",
          hasFullDayRate: true,
          hasFractions: false,
          minFractionMinutes: 60,
          rounding: "EXACT",
          enableRateByType: false,
          graceMinutes: 5,
        });
        break;
    }
  };

  const showBaseRate = billingModel === "HOURLY" || billingModel === "MIXED";
  const showFullDayAlways = billingModel === "FULL_DAY";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Presets */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <p className="text-base font-semibold">Configuración de Tarifas Inteligente</p>
          <QuestionHelp title="Tarifas">
            Elige un modelo de cobro o utiliza una configuración recomendada. El asistente ajustará los campos a lo que realmente necesitas.
          </QuestionHelp>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className={`cursor-pointer transition-all border ${isBasicSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-transparent hover:border-primary'}`} role="button" tabIndex={0} onClick={() => applyPreset("BASIC")} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); applyPreset("BASIC"); } }}>
            <Card.Content className="p-3 text-center flex flex-col items-center gap-2 relative">
              {isBasicSelected && <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />}
              <Zap className={`w-5 h-5 ${isBasicSelected ? 'text-primary' : 'text-warning'}`} />
              <p className="text-sm font-semibold">Básico</p>
              <p className="text-xs text-default-500">Solo cobro por hora. Simple y directo.</p>
            </Card.Content>
          </Card>
          <Card className={`cursor-pointer transition-all border ${isCommercialSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-transparent hover:border-primary'}`} role="button" tabIndex={0} onClick={() => applyPreset("COMMERCIAL")} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); applyPreset("COMMERCIAL"); } }}>
            <Card.Content className="p-3 text-center flex flex-col items-center gap-2 relative">
              {isCommercialSelected && <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />}
              <RefreshCcw className={`w-5 h-5 ${isCommercialSelected ? 'text-primary' : 'text-success'}`} />
              <p className="text-sm font-semibold">Comercial</p>
              <p className="text-xs text-default-500">Cobro por hora, con fracciones y tiempo de cortesía.</p>
            </Card.Content>
          </Card>
          <Card className={`cursor-pointer transition-all border ${is24HSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-transparent hover:border-primary'}`} role="button" tabIndex={0} onClick={() => applyPreset("24H")} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); applyPreset("24H"); } }}>
            <Card.Content className="p-3 text-center flex flex-col items-center gap-2 relative">
              {is24HSelected && <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />}
              <Moon className={`w-5 h-5 ${is24HSelected ? 'text-primary' : 'text-primary'}`} />
              <p className="text-sm font-semibold">24 Horas</p>
              <p className="text-xs text-default-500">Incluye tarifa nocturna y cobro por día completo.</p>
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* 1. Modelo Tarifario */}
      <div className="space-y-4 p-4 bg-default-50 dark:bg-zinc-900/50 rounded-xl border border-default-200">
        <p className="text-sm font-semibold text-primary">1. Modelo de Cobro Principal <RequiredMark/></p>
        <RadioGroup 
          orientation="horizontal" 
          value={billingModel}
          onChange={(val) => setStepData({ ...stepData, billingModel: val })}
          isInvalid={Boolean(stepErrors.billingModel)} aria-label="Campo RadioGroup"
        >
          <Radio value="HOURLY">Por hora</Radio>
          <Radio value="FRACTION">Fracción</Radio>
          <Radio value="FLAT">Tarifa Única</Radio>
          <Radio value="FULL_DAY">Día Completo</Radio>
          <Radio value="MIXED">Mixto</Radio>
          {stepErrors.billingModel && <FieldError>{stepErrors.billingModel}</FieldError>}
        </RadioGroup>

        {showBaseRate && (
          <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg mt-4">
            <span className="text-sm font-medium">
              Tarifa base por hora <RequiredMark />
            </span>
            <Input
              type="number"
              min={1}
              className="w-40"
              label="Valor"
              isRequired
              isInvalid={Boolean(stepErrors.baseValue)}
              errorMessage={stepErrors.baseValue}
              value={String(stepData.baseValue ?? "")}
              onChange={(v) => setStepData({ ...stepData, baseValue: Math.max(1, Number(v.target.value) || 1) })}
            />
          </div>
        )}

        {showFullDayAlways && (
          <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg mt-4">
            <span className="text-sm font-medium">
              Tarifa por día completo <RequiredMark />
            </span>
            <Input
              type="number"
              min={1}
              className="w-40"
              label="Valor"
              isRequired
              isInvalid={Boolean(stepErrors.flatRate)}
              errorMessage={stepErrors.flatRate}
              value={String(stepData.flatRate ?? "")}
              onChange={(v) => setStepData({ ...stepData, flatRate: Math.max(1, Number(v.target.value) || 1) })}
            />
          </div>
        )}
      </div>

      {billingModel && (
        <>
          {/* 2. Tarifas Especiales */}
          <div className="space-y-4">
            <p className="text-sm font-semibold border-b border-default-200 pb-2">Tarifas Especiales</p>
            
            <div className="space-y-3">
              {/* Tarifa Nocturna */}
              <div className="p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <Switch isSelected={hasNightRate} onChange={(v) => setStepData({ ...stepData, hasNightRate: v })} aria-label="Alternar opción">
                    <span className="text-sm font-medium">¿Maneja tarifa nocturna?</span>
                  </Switch>
                </div>
                {hasNightRate && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-default-100">
                    <Input type="time" label="Hora inicio" value={String(stepData.nightStartTime ?? "20:00")} onChange={(v) => setStepData({ ...stepData, nightStartTime: v.target.value })} />
                    <Input type="time" label="Hora fin" value={String(stepData.nightEndTime ?? "06:00")} onChange={(v) => setStepData({ ...stepData, nightEndTime: v.target.value })} />
                    <Input type="number" label="Valor noche" value={String(stepData.nightRate ?? "")} onChange={(v) => setStepData({ ...stepData, nightRate: Math.max(0, Number(v.target.value) || 0) })} />
                  </div>
                )}
              </div>

              {/* Día Completo (si no es el modelo principal) */}
              {!showFullDayAlways && (
                <div className="p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Switch isSelected={hasFullDayRate} onChange={(v) => setStepData({ ...stepData, hasFullDayRate: v })} aria-label="Alternar opción">
                      <span className="text-sm font-medium">¿Maneja tarifa de día completo (24h)?</span>
                    </Switch>
                    {hasFullDayRate && (
                      <Input type="number" className="w-32" aria-label="Valor" placeholder="Valor" value={String(stepData.fullDayRate ?? "")} onChange={(v) => setStepData({ ...stepData, fullDayRate: Math.max(0, Number(v.target.value) || 0) })} />
                    )}
                  </div>
                </div>
              )}

              {/* Fines de semana */}
              <div className="p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <Switch isSelected={hasWeekendRate} onChange={(v) => setStepData({ ...stepData, hasWeekendRate: v })} aria-label="Alternar opción">
                    <span className="text-sm font-medium">¿Tarifa diferente en fines de semana/festivos?</span>
                  </Switch>
                  {hasWeekendRate && (
                    <Input type="number" className="w-32" aria-label="Valor" placeholder="Valor" value={String(stepData.weekendRate ?? "")} onChange={(v) => setStepData({ ...stepData, weekendRate: Math.max(0, Number(v.target.value) || 0) })} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Reglas de Cobro */}
          <div className="space-y-4">
            <p className="text-sm font-semibold border-b border-default-200 pb-2">Reglas de Cobro</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Fracciones */}
              <div className="p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg space-y-3">
                <Switch isSelected={hasFractions} onChange={(v) => setStepData({ ...stepData, hasFractions: v })} aria-label="Alternar opción">
                  <span className="text-sm font-medium">¿Cobra fracciones?</span>
                </Switch>
                {hasFractions && (
                  <div className="flex gap-2">
                    <Input type="number" label="Minutos mínimos" className="flex-1" value={String(stepData.minFractionMinutes ?? "")} onChange={(v) => setStepData({ ...stepData, minFractionMinutes: Math.max(0, Number(v.target.value) || 0) })} />
                    <Input type="number" label="Valor fracción" className="flex-1" value={String(stepData.fractionValue ?? "")} onChange={(v) => setStepData({ ...stepData, fractionValue: Math.max(0, Number(v.target.value) || 0) })} />
                  </div>
                )}
              </div>

              {/* Cortesía */}
              <div className="p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg space-y-3">
                <Switch isSelected={hasCourtesy} onChange={(v) => setStepData({ ...stepData, hasCourtesy: v })} aria-label="Alternar opción">
                  <span className="text-sm font-medium">¿Minutos de cortesía (Gratis)?</span>
                </Switch>
                {hasCourtesy && (
                  <Input type="number" label="Minutos de cortesía" value={String(stepData.graceMinutes ?? "")} onChange={(v) => setStepData({ ...stepData, graceMinutes: Math.max(0, Number(v.target.value) || 0) })} />
                )}
              </div>
            </div>

            {/* Redondeo */}
            <div className="p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium">¿Cómo desea redondear el tiempo?</span>
              <Select
                className="w-48"
                aria-label="Redondeo"
                selectedKey={String(stepData.rounding ?? "EXACT")}
                onSelectionChange={(key) => {
                  const val = String(key);
                  if (val && ["EXACT", "15_MIN", "30_MIN", "1_HOUR"].includes(val)) {
                    setStepData({ ...stepData, rounding: val });
                  }
                }}
              >
                <Select.Trigger aria-label="Seleccionar opción"><Select.Value aria-label="Seleccionar opción" /><Select.Indicator aria-label="Seleccionar opción" /></Select.Trigger>
                <Select.Popover aria-label="Seleccionar opción">
                  <ListBox>
                    <ListBox.Item key="EXACT" textValue="Exacto al minuto">Exacto al minuto</ListBox.Item>
                    <ListBox.Item key="15_MIN" textValue="Cada 15 minutos">Cada 15 minutos</ListBox.Item>
                    <ListBox.Item key="30_MIN" textValue="Cada 30 minutos">Cada 30 minutos</ListBox.Item>
                    <ListBox.Item key="1_HOUR" textValue="Cada hora">Cada hora</ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          </div>

          {/* 4. Tarifas por Vehículo */}
          <div className="space-y-4">
            <p className="text-sm font-semibold border-b border-default-200 pb-2">Tarifas por Vehículo</p>
            <div className="p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
              <Switch isSelected={enableRateByType} onChange={(v) => setStepData({ ...stepData, enableRateByType: v })} aria-label="Alternar opción">
                <span className="text-sm font-medium">¿Desea manejar tarifas diferentes por tipo de vehículo?</span>
              </Switch>
              
              {enableRateByType && vehicleTypes.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {vehicleTypes.map((typeCode) => {
                      const vehicle = VEHICLE_OPTIONS.find(v => v.code === typeCode);
                      const rate = getRatesByType()[typeCode] ?? (stepData.baseValue as number ?? 0);
                      return (
                        <div key={typeCode} className="flex items-center justify-between p-2 bg-default-50 dark:bg-zinc-800/50 rounded-lg">
                          <span className="text-sm font-medium">{vehicle?.label || typeCode}</span>
                          <Input 
                            type="number" 
                            min="0"
                            className="w-32"
                            aria-label={`Tarifa ${vehicle?.label ?? typeCode}`}
                            value={String(rate)} 
                            onChange={(v) => {
                              const current = getRatesByType();
                              const next = { ...current, [typeCode]: Math.max(0, Number(v.target.value) || 0) };
                              setStepData({ ...stepData, ratesByType: next });
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {/* Option to add custom could go here in a future iteration. */}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default Step3Rates;
