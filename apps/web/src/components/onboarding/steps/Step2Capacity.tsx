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
  const { stepData, setStepData, stepErrors } = useOnboardingData();
  const { vehicleTypes } = useOnboardingMetadata();

  const totalVal = Number(stepData.totalCapacity) || 0;
  const byType = (stepData.capacityByType as Record<string, any>) || {};
  const sum = vehicleTypes.reduce((acc, typeCode) => acc + (Number(byType[typeCode]) || 0), 0);
  const showAllowLower = Boolean(stepData.controlSlots) && sum > 0 && totalVal > 0 && sum < totalVal;

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
        <div className="flex items-center justify-between p-3 bg-default-50 dark:bg-default-100 dark:bg-zinc-900 border border-default-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-default-400" />
            <span className="text-sm font-medium">Capacidad total</span>
          </div>
          <Input
            type="number"
            className="w-32"
            aria-label="Capacidad total"
            label="Total"
            isRequired
            isInvalid={Boolean(stepErrors.totalCapacity)}
            errorMessage={stepErrors.totalCapacity}
            value={stepData.totalCapacity !== undefined ? String(stepData.totalCapacity) : ""}
            onChange={(v) => setStepData({ ...stepData, totalCapacity: v.target.value === "" ? "" : v.target.value })}
          />
        </div>
      {vehicleTypes.length > 1 && (
        <div className="space-y-3">
          <Switch isSelected={Boolean(stepData.controlSlots)} onChange={(v) => setStepData({ ...stepData, controlSlots: v, allowLowerCapacity: v ? stepData.allowLowerCapacity : undefined })} aria-label="Alternar opción">
            ¿Quieres controlar cupos?
          </Switch>
          
          {Boolean(stepData.controlSlots) && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-default-600">Capacidad por tipo de vehículo:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {vehicleTypes.map((typeCode) => {
                  const vehicle = VEHICLE_OPTIONS.find(v => v.code === typeCode);
                  const capacity = byType[typeCode] !== undefined ? String(byType[typeCode]) : "";
                  const inputError = stepErrors[`capacityByType.${typeCode}`];
                  return (
                    <div key={typeCode} className="flex flex-col gap-1 p-2 bg-default-50 dark:bg-default-100 dark:bg-zinc-900 border border-default-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{vehicle?.label}</span>
                        <Input
                          type="number"
                          className="w-24"
                          aria-label={`Capacidad ${vehicle?.label ?? typeCode}`}
                          isInvalid={Boolean(inputError)}
                          value={capacity}
                          onChange={(v) => {
                            const next = { ...byType, [typeCode]: v.target.value === "" ? "" : v.target.value };
                            setStepData({ ...stepData, capacityByType: next });
                          }}
                        />
                      </div>
                      {inputError && (
                        <span className="text-xs text-danger mt-1" role="alert">{inputError}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showAllowLower && (
            <div className="p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 rounded-lg space-y-2">
              <p className="text-xs text-warning-700 dark:text-warning-300 font-medium">
                La suma de cupos por vehículo ({sum}) es menor que la capacidad total ({totalVal}).
              </p>
              <Switch
                isSelected={Boolean(stepData.allowLowerCapacity)}
                onChange={(v) => setStepData({ ...stepData, allowLowerCapacity: v })}
                aria-label="Permitir suma menor"
                color="warning"
                size="sm"
              >
                <span className="text-xs">Acepto que la capacidad por tipo sea menor a la total (quedarán cupos libres para uso general)</span>
              </Switch>
              {stepErrors.allowLowerCapacity && (
                <p className="text-xs text-danger" role="alert">{stepErrors.allowLowerCapacity}</p>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
});

export default Step2Capacity;
