import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useOnboarding } from "../OnboardingContext";

export default function Step9Agreements() {
  const { stepData, setStepData } = useOnboarding();

  return (
    <div className="space-y-4">
      <Switch isSelected={Boolean(stepData.enabled)} onChange={(v) => setStepData({ ...stepData, enabled: v })}>
        ¿Tienes convenios con empresas?
      </Switch>
      
      {Boolean(stepData.enabled) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
            <span className="text-sm">Descuento por convenio (%)</span>
            <Input 
              type="number" 
              min="0"
              max="100"
              className="w-24"
              aria-label="Descuento por convenio"
              value={String(stepData.agreementDiscount ?? "0")} 
              onChange={(v) => setStepData({ ...stepData, agreementDiscount: Math.max(0, Math.min(100, Number(v.target.value) || 0)) })} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
