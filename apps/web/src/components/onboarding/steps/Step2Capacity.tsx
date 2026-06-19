import { Input } from "@/components/bridge/Input";
import { Switch } from "@/components/bridge/Switch";
import QuestionHelp from "../QuestionHelp";
import { useOnboardingData, useOnboardingMetadata, VEHICLE_OPTIONS } from "../OnboardingContext";
import { memo } from "react";
import { Hash } from "lucide-react";

function RequiredMark() {
  return <span className="text-danger ml-0.5" aria-hidden="true">*</span>;
}

const Step2Capacity = memo(function Step2Capacity() {
  const { stepData, setStepData, stepErrors, getCapacityByType } = useOnboardingData();
  const { vehicleTypes } = useOnboardingMetadata();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">
          ¿Cuál es la capacidad de tu parqueadero?
          <RequiredMark />
        </p>
        <QuestionHelp title="Capacidad">
          Configura la capacidad total y por tipo de vehículo. Si activas “Controlar cupos”,
          la suma de capacidades por tipo no podrá superar la capacidad total.
        </QuestionHelp>
      </div>

      {stepErrors.capacityByType && (
        <p className="text-sm text-danger" role="alert">{stepErrors.capacityByType}</p>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-default-400" />
            <span className="text-sm font-medium">Capacidad total</span>
          </div>
          <Input
            type="number"
            min={1}
            className="w-32"
            aria-label="Capacidad total"
            label="Total"
            isRequired
            isInvalid={Boolean(stepErrors.totalCapacity)}
            errorMessage={stepErrors.totalCapacity}
            value={String(stepData.totalCapacity ?? "")}
            onChange={(v) => setStepData({ ...stepData, totalCapacity: Math.max(0, Number(v.target.value) || 0) })}
          />
        </div>
        
        <Switch isSelected={Boolean(stepData.controlSlots)} onChange={(v) => setStepData({ ...stepData, controlSlots: v })} aria-label="Alternar opción">
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
                  <div key={typeCode} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
                    <span className="text-sm">{vehicle?.label}</span>
                    <Input
                      type="number"
                      min={0}
                      className="w-24"
                      aria-label={`Capacidad ${vehicle?.label ?? typeCode}`}
                      isInvalid={Boolean(stepErrors.capacityByType)}
                      value={String(capacity)}
                      onChange={(v) => {
                        const current = getCapacityByType();
                        const next = { ...current, [typeCode]: Math.max(0, Number(v.target.value) || 0) };
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
  );
});

export default Step2Capacity;
