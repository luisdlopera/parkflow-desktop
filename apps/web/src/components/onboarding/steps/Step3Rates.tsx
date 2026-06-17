import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import QuestionHelp from "../QuestionHelp";
import { memo } from "react";
import { useOnboardingData, useOnboardingMetadata, VEHICLE_OPTIONS } from "../OnboardingContext";

function RequiredMark() {
  return <span className="text-danger ml-0.5" aria-hidden="true">*</span>;
}

const Step3Rates = memo(function Step3Rates() {
  const { stepData, setStepData, stepErrors, getRatesByType } = useOnboardingData();
  const { vehicleTypes } = useOnboardingMetadata();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">Configuración de tarifas</p>
        <QuestionHelp title="Tarifas">
          Configura el valor base y tarifas específicas por tipo de vehículo.
        </QuestionHelp>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
          <span className="text-sm font-medium">
            Tarifa base por hora
            <RequiredMark />
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
            onChange={(v) => setStepData({ ...stepData, baseValue: Math.max(0, Number(v.target.value) || 0), mode: "HOURLY" })}
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
                  <div key={typeCode} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
                    <span className="text-sm">{vehicle?.label}</span>
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
          </div>
        )}
        
        <div className="space-y-2">
          <p className="text-sm font-medium text-default-600">Tarifas especiales:</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
              <span className="text-sm">Tarifa mínima (minutos)</span>
              <Input 
                type="number" 
                min="0"
                className="w-24"
                aria-label="Tarifa mínima en minutos"
                value={String(stepData.minRateMinutes ?? "0")} 
                onChange={(v) => setStepData({ ...stepData, minRateMinutes: Math.max(0, Number(v.target.value) || 0) })} 
              />
            </div>
            <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
              <span className="text-sm">Tarifa diaria (24h)</span>
              <Input 
                type="number" 
                min="0"
                className="w-32"
                aria-label="Tarifa diaria"
                value={String(stepData.dailyRate ?? "")} 
                onChange={(v) => setStepData({ ...stepData, dailyRate: Math.max(0, Number(v.target.value) || 0) })} 
              />
            </div>
            <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
              <span className="text-sm">Tarifa nocturna</span>
              <Input 
                type="number" 
                min="0"
                className="w-32"
                aria-label="Tarifa nocturna"
                value={String(stepData.nightRate ?? "")} 
                onChange={(v) => setStepData({ ...stepData, nightRate: Math.max(0, Number(v.target.value) || 0) })} 
              />
            </div>
            <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
              <span className="text-sm">Tiempo de gracia (min)</span>
              <Input 
                type="number" 
                min="0"
                className="w-24"
                aria-label="Tiempo de gracia en minutos"
                value={String(stepData.graceMinutes ?? "0")} 
                onChange={(v) => setStepData({ ...stepData, graceMinutes: Math.max(0, Number(v.target.value) || 0) })} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Step3Rates;
