import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useOnboarding } from "../OnboardingContext";

export default function Step5Shifts() {
  const { stepData, setStepData } = useOnboarding();

  return (
    <div className="space-y-4">
      <Switch isSelected={Boolean(stepData.enabled)} onChange={(v) => setStepData({ ...stepData, enabled: v })}>
        ¿Trabajan por turnos?
      </Switch>
      
      {Boolean(stepData.enabled) && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-default-600">Horarios de turno:</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
              <span className="text-sm">Turno diurno inicio</span>
              <Input 
                type="time" 
                className="w-32"
                aria-label="Inicio turno diurno"
                value={String(stepData.dayShiftStart ?? "06:00")} 
                onChange={(v) => setStepData({ ...stepData, dayShiftStart: v.target.value })} 
              />
            </div>
            <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
              <span className="text-sm">Turno diurno fin</span>
              <Input 
                type="time" 
                className="w-32"
                aria-label="Fin turno diurno"
                value={String(stepData.dayShiftEnd ?? "18:00")} 
                onChange={(v) => setStepData({ ...stepData, dayShiftEnd: v.target.value })} 
              />
            </div>
            <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
              <span className="text-sm">Turno nocturno inicio</span>
              <Input 
                type="time" 
                className="w-32"
                aria-label="Inicio turno nocturno"
                value={String(stepData.nightShiftStart ?? "18:00")} 
                onChange={(v) => setStepData({ ...stepData, nightShiftStart: v.target.value })} 
              />
            </div>
            <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
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
  );
}
