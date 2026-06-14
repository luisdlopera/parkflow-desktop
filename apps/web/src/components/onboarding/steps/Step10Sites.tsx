import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useOnboarding } from "../OnboardingContext";

export default function Step10Sites() {
  const { stepData, setStepData, canMultiSite } = useOnboarding();

  return (
    <div>
      <Switch isSelected={Boolean(stepData.multiSite)} isDisabled={!canMultiSite} onChange={(v) => setStepData({ ...stepData, multiSite: v })}>
        ¿Varias sedes?
      </Switch>
      {!canMultiSite && <p className="text-xs text-warning mt-1">Disponible en plan superior.</p>}
      
      {Boolean(stepData.multiSite) && canMultiSite && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
            <span className="text-sm">Nombre sede principal</span>
            <Input 
              className="w-48"
              aria-label="Nombre sede principal"
              value={String(stepData.siteName1 ?? "Sede principal")} 
              onChange={(v) => setStepData({ ...stepData, siteName1: v.target.value })} 
            />
          </div>
          <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
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
  );
}
