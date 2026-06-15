import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Switch } from "@/components/ui/Switch";
import { Globe } from "lucide-react";
import { useOnboarding, COUNTRY_OPTIONS } from "../OnboardingContext";

function RequiredMark() {
  return <span className="text-danger ml-0.5" aria-hidden="true">*</span>;
}

export default function Step4BoxAndRegion() {
  const { stepData, setStepData, stepErrors } = useOnboarding();

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
      
      <div className="border-t border-default-200 pt-4">
        <Switch isSelected={Boolean(stepData.enabled)} onChange={(v) => setStepData({ ...stepData, enabled: v })}>
          ¿Manejas caja por operador?
        </Switch>
      </div>
    </div>
  );
}
