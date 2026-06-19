import { Input } from "@/components/bridge/Input";
import { Checkbox } from "@/components/bridge/Checkbox";
import { Switch } from "@/components/bridge/Switch";
import { Globe } from "lucide-react";
import { memo } from "react";
import { useOnboardingData, COUNTRY_OPTIONS } from "../OnboardingContext";

function RequiredMark() {
  return <span className="text-danger ml-0.5" aria-hidden="true">*</span>;
}

const Step4BoxAndRegion = memo(function Step4BoxAndRegion() {
  const { stepData, setStepData, stepErrors } = useOnboardingData();

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-default-400" />
          <p className="text-sm font-medium">
            Configuración regional
            <RequiredMark />
          </p>
        </div>

        {stepErrors.countryCode && (
          <p className="text-xs text-danger" role="alert">{stepErrors.countryCode}</p>
        )}

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
        
        <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
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
      
      <div className="border-t border-default-200 pt-4 space-y-4">
        <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
          <span className="text-sm font-medium">¿Cuántas terminales/cajas tienes?</span>
          <Input
            className="w-24"
            type="number"
            aria-label="Número de terminales"
            value={String(stepData.numTerminals ?? 1)}
            onChange={(v) => {
              const val = Math.max(1, parseInt(v.target.value, 10) || 1);
              setStepData({ ...stepData, numTerminals: val });
            }}
            min={1}
          />
        </div>
        <Switch isSelected={Boolean(stepData.enabled)} onChange={(v) => setStepData({ ...stepData, enabled: v })} aria-label="Alternar opción">
          ¿Manejas caja por operador?
        </Switch>
      </div>
    </div>
  );
});

export default Step4BoxAndRegion;
